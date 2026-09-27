import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "*.smtpPass",
      "*.smtpPassEncrypted",
      "*.accessToken",
      "*.accessTokenEncrypted",
      "*.password",
      "*.token",
      "*.TOKEN_ENCRYPTION_KEY",
      "*.SESSION_SECRET",
    ],
    censor: "[redacted]",
  },
});
