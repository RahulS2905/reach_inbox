import { describe, it, expect, afterAll } from "vitest";
import { reserveSendSlot } from "./reserveSendSlot";
import { redisConnection } from "../redis";

describe("reserveSendSlot (atomic Redis rate limiter)", () => {
  afterAll(async () => {
    await redisConnection.quit();
  });

  it("never lets more than `maxEmailsPerHour` reservations succeed under concurrent load", async () => {
    const senderId = `test-sender-${Date.now()}`;
    const limit = 5;
    const concurrency = 50;

    const results = await Promise.all(
      Array.from({ length: concurrency }, () =>
        reserveSendSlot(senderId, { minSendIntervalMs: 0, maxEmailsPerHour: limit }),
      ),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(limit);

    const deniedForQuota = results.filter((r) => !r.allowed && r.reason === "quota");
    expect(deniedForQuota.length).toBe(concurrency - limit);
    // Every denial must point at a real future retry time, not now/never.
    for (const d of deniedForQuota) {
      expect(d.retryAt).toBeGreaterThan(Date.now());
    }
  });

  it("enforces the minimum interval between sends for the same sender", async () => {
    const senderId = `test-sender-interval-${Date.now()}`;
    const minInterval = 200;

    const first = await reserveSendSlot(senderId, { minSendIntervalMs: minInterval, maxEmailsPerHour: 1000 });
    expect(first.allowed).toBe(true);

    const second = await reserveSendSlot(senderId, { minSendIntervalMs: minInterval, maxEmailsPerHour: 1000 });
    expect(second.allowed).toBe(false);
    expect(second.reason).toBe("interval");
    expect(second.retryAt).toBeGreaterThanOrEqual(Date.now());

    await new Promise((r) => setTimeout(r, minInterval + 10));

    const third = await reserveSendSlot(senderId, { minSendIntervalMs: minInterval, maxEmailsPerHour: 1000 });
    expect(third.allowed).toBe(true);
  });
});
