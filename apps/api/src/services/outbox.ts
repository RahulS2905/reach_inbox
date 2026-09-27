import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { emailQueue } from "../queue/emailQueue";
import { QUEUE_NAMES } from "@reachinbox/shared";
import { logger } from "../logger";

interface OutboxRow {
  id: string;
  payload: { emailJobId: string; senderAccountId: string };
}

/**
 * Moves PENDING OutboxEvent rows into BullMQ delayed jobs.
 *
 * Why this exists: creating the EmailJob row and enqueuing the BullMQ job
 * are two separate systems (Postgres, Redis). If the process crashed
 * between "commit the row" and "enqueue the job", the email would silently
 * never be scheduled. The outbox event is committed in the *same*
 * transaction as the EmailJob row, so relaying it is the only step that can
 * still fail/retry — and it's idempotent (see below), so retrying is safe.
 *
 * Concurrency safety: `FOR UPDATE SKIP LOCKED` lets multiple API instances
 * and the worker's periodic sweep call this concurrently without
 * double-processing the same row.
 *
 * Idempotency: BullMQ's jobId is set to the EmailJob's own id. We only ever
 * call `queue.add` when the EmailJob is still in PENDING status, and we
 * flip it to QUEUED in the same DB transaction as marking the outbox event
 * PROCESSED. In the narrow window where `queue.add` succeeded but the
 * status flip did not commit (process killed mid-transaction), a retry's
 * `queue.add` with the same jobId is a no-op against the existing BullMQ
 * job rather than a duplicate — so at most it re-sends identical job data,
 * never creates a second job.
 */
export async function relayPendingOutboxEvents(tenantId?: string, limit = 500): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<OutboxRow[]>(
      tenantId
        ? Prisma.sql`SELECT id, payload FROM "OutboxEvent"
             WHERE status = 'PENDING' AND "eventType" = 'email_job.schedule' AND "tenantId" = ${tenantId}
             ORDER BY "createdAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`
        : Prisma.sql`SELECT id, payload FROM "OutboxEvent"
             WHERE status = 'PENDING' AND "eventType" = 'email_job.schedule'
             ORDER BY "createdAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`,
    );

    let relayed = 0;
    for (const row of rows) {
      try {
        const job = await tx.emailJob.findUnique({ where: { id: row.payload.emailJobId } });
        if (!job) {
          // Referenced job was cancelled/deleted; nothing left to relay.
          await tx.outboxEvent.update({
            where: { id: row.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
          continue;
        }

        if (job.status === "PENDING") {
          const delay = Math.max(0, job.scheduledFor.getTime() - Date.now());
          await emailQueue.add(
            QUEUE_NAMES.emailSend,
            { emailJobId: job.id, tenantId: job.tenantId, senderAccountId: job.senderAccountId },
            { jobId: job.id, delay },
          );
          await tx.emailJob.update({
            where: { id: job.id },
            data: { status: "QUEUED", bullJobId: job.id },
          });
          relayed += 1;
        }

        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
      } catch (err) {
        logger.error({ err, outboxEventId: row.id }, "Failed to relay outbox event; will retry");
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { attempts: { increment: 1 }, lastError: String(err) },
        });
      }
    }
    return relayed;
  });
}
