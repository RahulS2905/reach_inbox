import { describe, it, expect } from "vitest";
import { parseRecipientList } from "./csv";

describe("parseRecipientList", () => {
  it("parses a newline-separated TXT list", () => {
    const result = parseRecipientList("a@example.com\nb@example.com\nc@example.com");
    expect(result.valid).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
    expect(result.invalid).toEqual([]);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("parses a comma-separated CSV row and strips an 'email' header", () => {
    const result = parseRecipientList("email\na@example.com,b@example.com\nc@example.com");
    expect(result.valid).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("case-insensitively de-duplicates, keeping the first occurrence", () => {
    const result = parseRecipientList("A@Example.com\na@example.com\nb@example.com");
    expect(result.valid).toEqual(["a@example.com", "b@example.com"]);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it("reports invalid addresses separately without dropping valid ones", () => {
    const result = parseRecipientList("not-an-email\na@example.com\nalso bad");
    expect(result.valid).toEqual(["a@example.com"]);
    expect(result.invalid).toEqual(["not-an-email", "also bad"]);
  });

  it("handles a large list without pathological slowdown", () => {
    const lines = Array.from({ length: 20000 }, (_, i) => `user${i}@example.com`).join("\n");
    const start = Date.now();
    const result = parseRecipientList(lines);
    expect(result.valid.length).toBe(20000);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
