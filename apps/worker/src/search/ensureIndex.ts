import { esClient, EMAIL_INDEX } from "./esClient";

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
}
