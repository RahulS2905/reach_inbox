import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@reachinbox/shared";
import { env } from "./env";
import { logger } from "./logger";
import { redisConnection } from "./redis";
import { prisma } from "./prisma";
import { processEmailSend } from "./processors/emailSendProcessor";
import { sweepScheduleOutbox } from "./outboxSweep";
import { relayPendingIndexEvents } from "./search/relayIndexEvents";
import { ensureEmailIndex } from "./search/ensureIndex";
import { checkCampaignCompletionAndNotify } from "./slack/campaignNotifier";

async function main() {
  await ensureEmailIndex().catch((err) => logger.warn({ err }, "ES index init failed at worker boot"));

  const worker = new Worker(QUEUE_NAMES.emailSend, processEmailSend, {
    connection: redisConnection,
    concurrency: env.WORKER_CONCURRENCY,
    // A crashed/stalled worker's job is safely picked back up rather than
    // silently lost — BullMQ re-checks the lock periodically.
    stalledInterval: 30_000,
  });

  worker.on("completed", async (job) => {
    logger.info({ jobId: job.id }, "Email job completed");
    try {
      const emailJobId = job.data.emailJobId as string;
      const jobData = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
      if (jobData) {
        await prisma.campaignEvent.create({
          data: {
            tenantId: jobData.tenantId,
            campaignId: jobData.campaignId,
            emailJobId: jobData.id,
            eventType: "sent",
            message: `Email sent to ${jobData.recipient}`,
          }
        });
        // Check if entire campaign is now done and notify Slack
        checkCampaignCompletionAndNotify(prisma, jobData.campaignId, jobData.tenantId).catch(() => undefined);
      }
    } catch (err) {
      logger.error({ err }, "Failed to log completed campaign event");
    }
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    logger.error({ jobId: job.id, err, attemptsMade: job.attemptsMade }, "Email job attempt failed");

    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= attempts) {
      // Retries exhausted — finalize as FAILED and index that terminal
      // state so it shows up correctly in search/Sent-Emails-with-failures.
      const emailJobId = job.data.emailJobId as string;
      const updated = await prisma.emailJob
        .update({ where: { id: emailJobId }, data: { status: "FAILED", lastError: String(err) } })
        .catch(() => null);
      if (updated) {
        await prisma.outboxEvent
          .create({ data: { tenantId: updated.tenantId, eventType: "email_job.index", payload: { emailJobId } } })
          .catch(() => undefined);
          
        await prisma.campaignEvent.create({
          data: {
            tenantId: updated.tenantId,
            campaignId: updated.campaignId,
            emailJobId: updated.id,
            eventType: "failed",
            message: `Email failed to send to ${updated.recipient}: ${err.message || err}`,
          }
        }).catch(() => undefined);

        // Check if entire campaign is now done and notify Slack
        checkCampaignCompletionAndNotify(prisma, updated.campaignId, updated.tenantId).catch(() => undefined);
      }
    }
  });

  worker.on("error", (err) => logger.error({ err }, "Worker-level error"));

  // Reconciliation sweeps — see outboxSweep.ts / relayIndexEvents.ts for why
  // these are safety nets, not the scheduling mechanism itself.
  const outboxSweepTimer = setInterval(() => {
    sweepScheduleOutbox(prisma).catch((err) => logger.error({ err }, "Outbox sweep tick failed"));
  }, 10_000);

  const indexSweepTimer = setInterval(() => {
    relayPendingIndexEvents(prisma).catch((err) => logger.error({ err }, "Index sweep tick failed"));
  }, 5_000);

  const heartbeatTimer = setInterval(() => {
    redisConnection.set("worker:heartbeat", Date.now().toString()).catch(() => undefined);
  }, 30_000);

  // Set initial heartbeat immediately
  redisConnection.set("worker:heartbeat", Date.now().toString()).catch(() => undefined);

  logger.info({ concurrency: env.WORKER_CONCURRENCY }, "Worker started");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down worker");
    clearInterval(outboxSweepTimer);
    clearInterval(indexSweepTimer);
    clearInterval(heartbeatTimer);
    await worker.close();
    await Promise.allSettled([prisma.$disconnect(), redisConnection.quit()]);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during worker startup");
  process.exit(1);
});
