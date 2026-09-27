const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedRecipients {
  valid: string[]; // de-duplicated, lower-cased
  invalid: string[]; // originals that failed validation
  duplicatesRemoved: number;
}

/**
 * Accepts either a CSV (first column, or a column literally named "email")
 * or a plain newline/comma-separated TXT list. Dedupe policy: case-insensitive
 * exact match on the address is treated as a duplicate; the first occurrence
 * wins and later ones are dropped (documented in the README).
 */
export function parseRecipientList(fileContents: string): ParsedRecipients {
  const rawTokens = fileContents
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => t.toLowerCase() !== "email"); // strip a CSV header if present

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicatesRemoved = 0;

  for (const token of rawTokens) {
    if (!EMAIL_RE.test(token)) {
      invalid.push(token);
      continue;
    }
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicatesRemoved };
}
