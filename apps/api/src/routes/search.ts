import { Router } from "express";
import type { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";
import { requireAuth } from "../middleware/requireAuth";
import { esClient, EMAIL_INDEX } from "../search/esClient";
import { reindexAll } from "../search/indexing";
import { SearchQuerySchema } from "@reachinbox/shared";

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get("/emails", async (req, res, next) => {
  try {
    const q = SearchQuerySchema.parse(req.query);

    // The tenant filter is always included and is never derived from user
    // input — it comes only from the authenticated session — so a search
    // request can never see another tenant's emails regardless of what
    // filters the client sends.
    const filter: QueryDslQueryContainer[] = [{ term: { tenantId: req.tenantId! } }];
    if (q.status) filter.push({ term: { status: q.status } });
    if (q.senderAccountId) filter.push({ term: { senderAccountId: q.senderAccountId } });
    if (q.campaignId) filter.push({ term: { campaignId: q.campaignId } });
    if (q.from || q.to) {
      filter.push({
        range: {
          scheduledFor: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) },
        },
      });
    }

    const must: QueryDslQueryContainer[] = q.q
      ? [{ multi_match: { query: q.q, fields: ["recipient^2", "subject^2", "body"] } }]
      : [{ match_all: {} }];
    const result = await esClient.search({
      index: EMAIL_INDEX,
      from: (q.page - 1) * q.pageSize,
      size: q.pageSize,
      query: { bool: { must, filter } },
      sort: [{ scheduledFor: "desc" }],
    });

    res.json({
      total:
        typeof result.hits.total === "number" ? result.hits.total : (result.hits.total?.value ?? 0),
      page: q.page,
      pageSize: q.pageSize,
      items: result.hits.hits.map((h) => h._source),
    });
  } catch (err) {
    next(err);
  }
});

// Admin utility: rebuild the index from Postgres (source of truth) after an
// ES outage or mapping change.
searchRouter.post("/reindex", async (_req, res, next) => {
  try {
    const total = await reindexAll();
    res.json({ reindexed: total });
  } catch (err) {
    next(err);
  }
});
