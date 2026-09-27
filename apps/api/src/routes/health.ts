import { Router } from "express";
import { prisma } from "../prisma";
import { redisConnection } from "../redis";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/ready", async (_req, res) => {
  const checks: Record<string, boolean> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  try {
    checks.redis = (await redisConnection.ping()) === "PONG";
  } catch {
    checks.redis = false;
  }

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not-ready", checks });
});
