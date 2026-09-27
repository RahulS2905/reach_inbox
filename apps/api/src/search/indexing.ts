import { esClient, EMAIL_INDEX } from "./esClient";
import { prisma } from "../prisma";
import { logger } from "../logger";

export async function ensureEmailIndex() {
  const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        tenantId: { type: "keyword" },
        campaignId: { type: "keyword" },
        senderAccountId: { type: "keyword" },
        recipient: { type: "keyword", fields: { text: { type: "text" } } },
        subject: { type: "text", analyzer: "standard" },
        body: { type: "text", analyzer: "standard" },
        status: { type: "keyword" },
        scheduledFor: { type: "date" },
        sentAt: { type: "date" },
        createdAt: { type: "date" },
      },
    },
  });
  logger.info({ index: EMAIL_INDEX }, "Created Elasticsearch index");
}

export async function indexEmailJob(emailJobId: string) {
  const job = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
  if (!job) {
    // Job was deleted — remove any stale document instead of indexing.
    await esClient.delete({ index: EMAIL_INDEX, id: emailJobId }).catch(() => undefined);
    return;
  }

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
}

/** Rebuilds the index from Postgres (the source of truth) from scratch. */
export async function reindexAll(batchSize = 500) {
  await esClient.indices.delete({ index: EMAIL_INDEX }).catch(() => undefined);
  await ensureEmailIndex();

  let cursor: string | undefined;
  let total = 0;
  for (;;) {
    const batch = await prisma.emailJob.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;

    const operations = batch.flatMap((job: (typeof batch)[number]) => [
      { index: { _index: EMAIL_INDEX, _id: job.id } },
      {
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
    ]);
    await esClient.bulk({ operations });

    total += batch.length;
    cursor = batch[batch.length - 1].id;
  }
  logger.info({ total }, "Reindex complete");
  return total;
}
