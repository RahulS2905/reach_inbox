import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../crypto";
import { postSlackMessage } from "./client";
import { logger } from "../logger";

/**
 * Notifies the tenant's connected Slack channel exactly once per
 * (sender, hour-window) when that sender's hourly quota is hit — dedup is
 * enforced by a DB unique constraint on (tenantId, dedupeKey), so this is
 * safe to call from multiple concurrent worker processes: only the first
 * caller's insert succeeds, everyone else's unique-violation is treated as
 * "already notified" and silently skipped.
 *
 * If the tenant hasn't connected Slack, this is a no-op (never throws).
 * If the Slack API call fails transiently, the error is logged and
 * swallowed — a flaky notification must never fail or crash the email send
 * path.
 */
export async function notifyRateLimitHit(
  prisma: PrismaClient,
  tenantId: string,
  senderAccountId: string,
  senderLabel: string,
  windowStartMs: number,
) {
  const dedupeKey = `${senderAccountId}:${windowStartMs}`;

  try {
    await prisma.notificationLog.create({
      data: { tenantId, kind: "rate_limit_hit", dedupeKey, senderAccountId },
    });
  } catch (err) {
    // Unique constraint violation => another worker already claimed this
    // notification for this sender+window. Anything else is a real error
    // worth logging, but still must not block/crash email sending.
    const isDup = (err as { code?: string })?.code === "P2002";
    if (!isDup) logger.warn({ err, senderAccountId }, "Failed to record rate-limit notification dedupe key");
    return;
  }

  try {
    const conn = await prisma.slackConnection.findFirst({
      where: { tenantId, disconnectedAt: null, channelId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (!conn || !conn.channelId) return; // not connected (or no channel picked yet) — silently skip

    const token = decryptSecret(conn.accessTokenEncrypted);
    await postSlackMessage(
      token,
      conn.channelId,
      `⏱️ Sender *${senderLabel}* just hit its hourly send limit. Remaining emails for this hour have been rescheduled into the next window.`,
    );
  } catch (err) {
    logger.warn({ err, senderAccountId }, "Slack notification failed (non-fatal)");
  }
}
