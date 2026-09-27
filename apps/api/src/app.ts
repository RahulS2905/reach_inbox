import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { env } from "./env";
import { logger } from "./logger";
import { authRouter } from "./routes/auth";
import { emailsRouter } from "./routes/emails";
import { sendersRouter } from "./routes/senders";
import { campaignsRouter } from "./routes/campaigns";
import { slackRouter } from "./routes/slack";
import { searchRouter } from "./routes/search";
import { healthRouter } from "./routes/health";
import { queuesUiRouter } from "./routes/queuesUi";
import { statsRouter } from "./routes/stats";
import { queueHealthRouter } from "./routes/queueHealth";
import { notFoundHandler, errorHandler } from "./http/errorHandler";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = typeof existing === "string" ? existing : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
    }),
  );

  // Sensitive/expensive endpoints get their own tighter rate limit on top of
  // any tenant-level email rate limiting done inside the worker.
  const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true });
  const scheduleLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true });

  app.use("/api", healthRouter);
  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/senders", sendersRouter);
  app.use("/api/campaigns", campaignsRouter);
  app.use("/api/emails/schedule", scheduleLimiter);
  app.use("/api/emails", emailsRouter);
  app.use("/api/slack", slackRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/queue-health", queueHealthRouter);
  app.use("/admin/queues", queuesUiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
