import { Prisma, PrismaClient } from "@prisma/client";
import { esClient, EMAIL_INDEX } from "./esClient";
import { logger } from "../logger";

interface OutboxRow {
  id: string;
  payload: { emailJobId: string };
}

/**
 * Relays `email_job.index` outbox events into Elasticsearch. Postgres stays
 * the source of truth throughout: if ES is down, events simply stay PENDING
 * (attempts/lastError recorded) and are retried on the next sweep tick —
 * search results are eventually consistent with Postgres, documented as a
 * known trade-off, but nothing about scheduling or sending ever depends on
 * this succeeding.
 */
export async function relayPendingIndexEvents(prisma: PrismaClient, limit = 500): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<OutboxRow[]>(
      Prisma.sql`SELECT id, payload FROM "OutboxEvent"
         WHERE status = 'PENDING' AND "eventType" = 'email_job.index'
         ORDER BY "createdAt" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED`,
    );
    if (rows.length === 0) return 0;

    let relayed = 0;
    for (const row of rows) {
      try {
        const job = await tx.emailJob.findUnique({ where: { id: row.payload.emailJobId } });
        if (job) {
          await esClient.index({
            index: EMAIL_INDEX,
            id: job.id,
            document: {
              tenantId: job.tenantId,
              campaignId: job.campaignId,
              senderAccountId: job.senderAccountId,
              recipient: job.recipient,
              subject: job.subject,
              body: job.body,
              status: job.status,
              scheduledFor: job.scheduledFor,
              sentAt: job.sentAt,
              createdAt: job.createdAt,
            },
          });
        } else {
          await esClient.delete({ index: EMAIL_INDEX, id: row.payload.emailJobId }).catch(() => undefined);
        }
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
        relayed += 1;
      } catch (err) {
        logger.warn({ err, outboxEventId: row.id }, "ES index relay failed; will retry");
        await tx.outboxEvent.update({
          where: { id: row.id },
          data: { attempts: { increment: 1 }, lastError: String(err) },
        });
      }
    }
    return relayed;
  });
}
