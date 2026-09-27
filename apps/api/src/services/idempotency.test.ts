import { describe, it, expect } from "vitest";
import { hashRequestBody } from "./idempotency";

describe("hashRequestBody", () => {
  it("produces the same hash for identical payloads", () => {
    const payload = { subject: "Hi", recipients: ["a@example.com", "b@example.com"] };
    expect(hashRequestBody(payload)).toBe(hashRequestBody({ ...payload }));
  });

  it("produces a different hash when the payload differs", () => {
    const a = hashRequestBody({ subject: "Hi", recipients: ["a@example.com"] });
    const b = hashRequestBody({ subject: "Hi", recipients: ["b@example.com"] });
    expect(a).not.toBe(b);
  });
});
