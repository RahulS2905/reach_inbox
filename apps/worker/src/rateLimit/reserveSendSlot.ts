import { redisConnection } from "../redis";

/**
 * Single atomic script enforcing two limits per sender:
 *   1. A minimum interval between successive sends (throttling).
 *   2. A hard cap on sends within the current clock-hour window (quota).
 *
 * Being one Lua script means the read-check-increment sequence is atomic in
 * Redis regardless of how many worker processes/instances call it
 * concurrently — there is no read-then-write race window, unlike an
 * in-memory counter or a non-atomic GET+SET pair.
 *
 * Returns:
 *   allowed=true  -> the slot is reserved (counter incremented, safe to send)
 *   allowed=false -> retryAt (epoch ms) is either "wait out the min interval"
 *                    or "wait for the next hour window", whichever applies.
 *   reason distinguishes the two so the caller can decide whether a
 *   rate-limit Slack notification is warranted (only for quota, not for
 *   ordinary send-spacing throttling).
 */
const RESERVE_SCRIPT = `
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local now = tonumber(ARGV[1])
local minInterval = tonumber(ARGV[2])
local nextAllowedByInterval = last + minInterval

if now < nextAllowedByInterval then
  return {0, nextAllowedByInterval, 0}
end

local count = tonumber(redis.call('GET', KEYS[2]) or '0')
local limit = tonumber(ARGV[3])

if count >= limit then
  return {0, tonumber(ARGV[4]), 1}
end

redis.call('SET', KEYS[1], now)
local newCount = redis.call('INCR', KEYS[2])
if newCount == 1 then
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[5]))
end

return {1, now, 0}
`;

export interface ReservationResult {
  allowed: boolean;
  retryAt: number;
  reason: "interval" | "quota" | null;
}

export async function reserveSendSlot(
  senderAccountId: string,
  opts: { minSendIntervalMs: number; maxEmailsPerHour: number },
): Promise<ReservationResult> {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  const lastKey = `sender:${senderAccountId}:last`;
  const hourKey = `sender:${senderAccountId}:hour:${windowStart}`;

  const raw = (await redisConnection.eval(
    RESERVE_SCRIPT,
    2,
    lastKey,
    hourKey,
    String(now),
    String(opts.minSendIntervalMs),
    String(opts.maxEmailsPerHour),
    String(windowEnd),
    String(Math.ceil((windowMs * 2) / 1000)), // TTL: 2 windows, so a stray key self-expires
  )) as [number, number, number];

  const [allowed, retryAt, reasonCode] = raw;
  return {
    allowed: allowed === 1,
    retryAt,
    reason: allowed === 1 ? null : reasonCode === 1 ? "quota" : "interval",
  };
}
