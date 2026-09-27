import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  ELASTICSEARCH_URL: z.string().url(),
  ELASTICSEARCH_INDEX: z.string().default("emails"),

  SESSION_SECRET: z.string().min(16),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z.string().default(""),

  SLACK_CLIENT_ID: z.string().default(""),
  SLACK_CLIENT_SECRET: z.string().default(""),
  SLACK_SIGNING_SECRET: z.string().default(""),
  SLACK_CALLBACK_URL: z.string().default(""),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_SEND_INTERVAL_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast and loud at boot rather than deep inside a request handler.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
