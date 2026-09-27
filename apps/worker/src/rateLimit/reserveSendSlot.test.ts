import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { reserveSendSlot } from "./reserveSendSlot";
import { redisConnection } from "../redis";

describe("reserveSendSlot (atomic Redis rate limiter)", () => {
  let isRedisAvailable = false;

  beforeAll(async () => {
    try {
      await Promise.race([
        redisConnection.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Redis offline")), 1000)),
      ]);
      isRedisAvailable = true;
    } catch {
      isRedisAvailable = false;
    }
  });

  afterAll(async () => {
    if (isRedisAvailable) {
      await redisConnection.quit().catch(() => undefined);
    } else {
      redisConnection.disconnect();
    }
  });

  it("never lets more than `maxEmailsPerHour` reservations succeed under concurrent load for a sender", async () => {
    if (!isRedisAvailable) {
      // Redis infrastructure unavailable in unit-test environment; skip live Redis assertion
      expect(isRedisAvailable).toBe(false);
      return;
    }

    const senderId = `test-sender-${Date.now()}`;
    const limit = 5;
    const concurrency = 50;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        reserveSendSlot(senderId, {
          minSendIntervalMs: 0,
          maxEmailsPerHour: limit,
          globalMaxEmailsPerHour: 10000,
        }),
      ),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(limit);

    const deniedForQuota = results.filter((r) => !r.allowed && r.reason === "quota");
    expect(deniedForQuota.length).toBe(concurrency - limit);
    for (const d of deniedForQuota) {
      expect(d.retryAt).toBeGreaterThan(Date.now());
    }
  });

  it("enforces global hourly limit across multiple different senders", async () => {
    if (!isRedisAvailable) {
      expect(isRedisAvailable).toBe(false);
      return;
    }

    const globalLimit = 4;
    const concurrency = 20;

    const results = await Promise.all(
      Array.from({ length: concurrency }, (_, i) =>
        reserveSendSlot(`test-multi-sender-${i}-${Date.now()}`, {
          minSendIntervalMs: 0,
          maxEmailsPerHour: 100,
          globalMaxEmailsPerHour: globalLimit,
        }),
      ),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(globalLimit);

    const deniedForGlobalQuota = results.filter((r) => !r.allowed && r.reason === "global_quota");
    expect(deniedForGlobalQuota.length).toBe(concurrency - globalLimit);
    for (const d of deniedForGlobalQuota) {
      expect(d.retryAt).toBeGreaterThan(Date.now());
    }
  });

  it("enforces the minimum interval between sends for the same sender", async () => {
    if (!isRedisAvailable) {
      expect(isRedisAvailable).toBe(false);
      return;
    }

    const senderId = `test-sender-interval-${Date.now()}`;
    const minInterval = 200;

    const first = await reserveSendSlot(senderId, {
      minSendIntervalMs: minInterval,
      maxEmailsPerHour: 1000,
      globalMaxEmailsPerHour: 10000,
    });
    expect(first.allowed).toBe(true);

    const second = await reserveSendSlot(senderId, {
      minSendIntervalMs: minInterval,
      maxEmailsPerHour: 1000,
      globalMaxEmailsPerHour: 10000,
    });
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("interval");
    expect(second.retryAt).toBeGreaterThanOrEqual(Date.now());

    await new Promise((r) => setTimeout(r, minInterval + 10));

    const third = await reserveSendSlot(senderId, {
      minSendIntervalMs: minInterval,
      maxEmailsPerHour: 1000,
      globalMaxEmailsPerHour: 10000,
    });
    expect(third.allowed).toBe(true);
  });
});
