import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import { redisConnection } from "../redis";
import { esClient } from "../search/esClient";
import { emailQueue } from "../queue/emailQueue";
import type { ServiceHealthDTO, QueueHealthDTO } from "@reachinbox/shared";

export const queueHealthRouter = Router();
queueHealthRouter.use(requireAuth);

queueHealthRouter.get("/", async (req, res, next) => {
  try {
    const health: ServiceHealthDTO = {
      postgres: { status: "down" },
      redis: { status: "down" },
      elasticsearch: { status: "down" },
      queues: [],
    };

    // Postgres
    try {
      const pgStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      health.postgres = { status: "up", latencyMs: Date.now() - pgStart };
    } catch {
      // already defaults to down
    }

    // Redis
    try {
      const redisStart = Date.now();
      await redisConnection.ping();
      health.redis = { status: "up", latencyMs: Date.now() - redisStart };
    } catch {
      // already defaults to down
    }

    // Elasticsearch
    try {
      const esStart = Date.now();
      const esPing = await esClient.ping();
      if (esPing) {
        health.elasticsearch = { status: "up", latencyMs: Date.now() - esStart };
      }
    } catch {
      // already defaults to down
    }

    // Queue metrics (only the main email-send queue)
    try {
      const counts = await emailQueue.getJobCounts(
        "waiting",
        "active",
        "delayed",
        "failed",
        "completed",
        "paused",
      );
      health.queues.push({
        queueName: emailQueue.name,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        completed: counts.completed ?? 0,
        paused: counts.paused ?? 0,
      } satisfies QueueHealthDTO);
    } catch {
      // queue unavailable
    }

    // Worker Heartbeat
    try {
      const heartbeat = await redisConnection.get("worker:heartbeat");
      if (heartbeat) {
        health.workerLastSeen = new Date(parseInt(heartbeat, 10)).toISOString();
      }
    } catch {
      // heartbeat unavailable
    }

    res.json(health);
  } catch (err) {
    next(err);
  }
});
