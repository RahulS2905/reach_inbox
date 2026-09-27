import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/reachinbox"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  ELASTICSEARCH_URL: z.string().url().default("http://localhost:9200"),
  ELASTICSEARCH_INDEX: z.string().default("emails"),

  SESSION_SECRET: z.string().min(16).default("super-secret-session-key-for-dev-12345"),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).default("0123456789abcdef0123456789abcdef"),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z.string().default("http://localhost:4000/api/auth/google/callback"),

  SLACK_CLIENT_ID: z.string().default(""),
  SLACK_CLIENT_SECRET: z.string().default(""),
  SLACK_SIGNING_SECRET: z.string().default(""),
  SLACK_CALLBACK_URL: z.string().default("http://localhost:4000/api/slack/oauth/callback"),

  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_SEND_INTERVAL_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().default(200),
  GLOBAL_MAX_EMAILS_PER_HOUR: z.coerce.number().default(1000),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast and loud at boot rather than deep inside a request handler.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
