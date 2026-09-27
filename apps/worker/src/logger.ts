import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["*.smtpPass", "*.smtpPassEncrypted", "*.accessToken", "*.accessTokenEncrypted", "*.token"],
    censor: "[redacted]",
  },
});
