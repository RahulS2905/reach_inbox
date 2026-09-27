import { redisConnection } from "../redis";
import { env } from "../env";

/**
 * Single atomic script enforcing three limits across all workers:
 *   1. A minimum interval between successive sends for the specific sender.
 *   2. A hard cap on sends within the current clock-hour window for the sender.
 *   3. A global hard cap on sends within the current clock-hour window across ALL senders.
 *
 * Being one Lua script means the read-check-increment sequence is atomic in
 * Redis regardless of how many worker processes/instances call it
 * concurrently.
 *
 * Returns:
 *   allowed=true  -> the slot is reserved (counters incremented, safe to send)
 *   allowed=false -> retryAt (epoch ms) is either "wait out the min interval"
 *                    or "wait for the next hour window", whichever applies.
 *   reason distinguishes interval vs per-sender quota vs global quota.
 */
const RESERVE_SCRIPT = `
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local now = tonumber(ARGV[1])
local minInterval = tonumber(ARGV[2])
local nextAllowedByInterval = last + minInterval

if now < nextAllowedByInterval then
  return {0, nextAllowedByInterval, 0}
end

local senderCount = tonumber(redis.call('GET', KEYS[2]) or '0')
local senderLimit = tonumber(ARGV[3])
local windowEnd = tonumber(ARGV[5])

if senderCount >= senderLimit then
  return {0, windowEnd, 1}
end

local globalCount = tonumber(redis.call('GET', KEYS[3]) or '0')
local globalLimit = tonumber(ARGV[4])

if globalCount >= globalLimit then
  return {0, windowEnd, 2}
end

redis.call('SET', KEYS[1], now)

local newSenderCount = redis.call('INCR', KEYS[2])
if newSenderCount == 1 then
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[6]))
end

local newGlobalCount = redis.call('INCR', KEYS[3])
if newGlobalCount == 1 then
  redis.call('EXPIRE', KEYS[3], tonumber(ARGV[6]))
end

return {1, now, 0}
`;

export interface ReservationResult {
  allowed: boolean;
  retryAt: number;
  reason: "interval" | "quota" | "global_quota" | null;
}

export async function reserveSendSlot(
  senderAccountId: string,
  opts: {
    minSendIntervalMs: number;
    maxEmailsPerHour: number;
    globalMaxEmailsPerHour?: number;
  },
): Promise<ReservationResult> {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  const lastKey = `sender:${senderAccountId}:last`;
  const senderHourKey = `sender:${senderAccountId}:hour:${windowStart}`;
  const globalHourKey = `global:hour:${windowStart}`;

  const globalLimit = opts.globalMaxEmailsPerHour ?? env.GLOBAL_MAX_EMAILS_PER_HOUR;

  const raw = (await redisConnection.eval(
    RESERVE_SCRIPT,
    3,
    lastKey,
    senderHourKey,
    globalHourKey,
    String(now),
    String(opts.minSendIntervalMs),
    String(opts.maxEmailsPerHour),
    String(globalLimit),
    String(windowEnd),
    String(Math.ceil((windowMs * 2) / 1000)), // TTL: 2 windows
  )) as [number, number, number];

  const [allowed, retryAt, reasonCode] = raw;
  let reason: ReservationResult["reason"] = null;
  if (allowed === 0) {
    if (reasonCode === 1) reason = "quota";
    else if (reasonCode === 2) reason = "global_quota";
    else reason = "interval";
  }

  return {
    allowed: allowed === 1,
    retryAt,
    reason,
  };
}
