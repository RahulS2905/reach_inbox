import { Prisma, PrismaClient } from "@prisma/client";
import { emailQueue } from "./queue/emailQueue";
import { QUEUE_NAMES } from "@reachinbox/shared";
import { logger } from "./logger";

interface OutboxRow {
  id: string;
  payload: { emailJobId: string; senderAccountId: string };
}

/**
 * Safety-net sweep: the API already relays each schedule request's outbox
 * rows immediately after commit (best-effort). This sweep exists purely to
 * catch the case where that immediate relay never ran at all — e.g. the API
 * process was killed between the DB commit and the relay call. It is NOT
 * how emails are normally scheduled to send (that's still 100% BullMQ
 * delayed jobs); it only guarantees an outbox row can't be silently
 * abandoned forever. Running every few seconds is a reconciliation
 * heartbeat, not the "cron job that sends emails" the assignment forbids —
 * actual send timing is always driven by the BullMQ delayed job's `delay`,
 * computed from EmailJob.scheduledFor.
 */
export async function sweepScheduleOutbox(prisma: PrismaClient, limit = 500): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<OutboxRow[]>(
      Prisma.sql`SELECT id, payload FROM "OutboxEvent"
         WHERE status = 'PENDING' AND "eventType" = 'email_job.schedule'
         ORDER BY "createdAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`,
    );
    if (rows.length === 0) return 0;

    let relayed = 0;
    for (const row of rows) {
      try {
        const job = await tx.emailJob.findUnique({ where: { id: row.payload.emailJobId } });
        if (!job) {
          await tx.outboxEvent.update({ where: { id: row.id }, data: { status: "PROCESSED", processedAt: new Date() } });
          continue;
        }
        if (job.status === "PENDING") {
          const delay = Math.max(0, job.scheduledFor.getTime() - Date.now());
          await emailQueue.add(
            QUEUE_NAMES.emailSend,
            { emailJobId: job.id, tenantId: job.tenantId, senderAccountId: job.senderAccountId },
            { jobId: job.id, delay },
          );
          await tx.emailJob.update({ where: { id: job.id }, data: { status: "QUEUED", bullJobId: job.id } });
          relayed += 1;
        }
        await tx.outboxEvent.update({ where: { id: row.id }, data: { status: "PROCESSED", processedAt: new Date() } });
      } catch (err) {
        logger.error({ err, outboxEventId: row.id }, "Outbox sweep relay failed; will retry next tick");
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { attempts: { increment: 1 }, lastError: String(err) },
        });
      }
    }
    return relayed;
  });
}
