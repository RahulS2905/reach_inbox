import crypto from "node:crypto";
import { env } from "./env";

const KEY = crypto.createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY).digest();
const ALGO = "aes-256-gcm";

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptSecret(encoded: string): string {
  const [ivHex, authTagHex, dataHex] = encoded.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Malformed encrypted secret");
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
