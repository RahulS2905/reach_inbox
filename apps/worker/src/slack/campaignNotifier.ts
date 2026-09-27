import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../crypto";
import { postSlackMessage } from "./client";
import { logger } from "../logger";

/**
 * After each email job finishes (sent or failed permanently), check whether
 * the entire campaign is now complete (no PENDING/QUEUED/RESERVED/SENDING/
 * RESCHEDULED jobs remain). If so, update campaign status and send a single
 * Slack notification with final delivery counts.
 *
 * Dedup: uses the NotificationLog table with dedupeKey = `campaign_done:${campaignId}`
 * to ensure exactly one notification per campaign completion, even across
 * concurrent workers.
 *
 * This function never throws — Slack failures are logged and swallowed.
 */
export async function checkCampaignCompletionAndNotify(
  prisma: PrismaClient,
  campaignId: string,
  tenantId: string,
) {
  try {
    const activeCount = await prisma.emailJob.count({
      where: {
        campaignId,
        status: { in: ["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"] },
      },
    });

    if (activeCount > 0) return; // Campaign still in progress

    // All jobs are terminal — compute final stats
    const stats = await prisma.emailJob.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    });

    const countFor = (statuses: string[]) =>
      stats.filter((s) => statuses.includes(s.status)).reduce((acc, s) => acc + s._count._all, 0);

    const sent = countFor(["SENT"]);
    const failed = countFor(["FAILED"]);
    const cancelled = countFor(["CANCELLED"]);
    const total = sent + failed + cancelled;

    const hasFailed = failed > 0;
    const finalStatus = hasFailed ? "COMPLETED" : "COMPLETED"; // completed regardless, but we note failures

    // Update campaign status
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: { in: ["ACTIVE", "SCHEDULING"] } },
      data: { status: finalStatus },
    });

    // Log campaign completion event
    await prisma.campaignEvent.create({
      data: {
        tenantId,
        campaignId,
        eventType: hasFailed ? "completed_with_errors" : "completed",
        message: `Campaign completed: ${sent} sent, ${failed} failed, ${cancelled} cancelled out of ${total} total`,
      },
    }).catch(() => undefined);

    // Deduplicate notification
    const dedupeKey = `campaign_done:${campaignId}`;
    try {
      await prisma.notificationLog.create({
        data: { tenantId, kind: "campaign_done", dedupeKey, senderAccountId: campaignId },
      });
    } catch (err) {
      // Unique constraint → another worker already sent this notification
      if ((err as { code?: string })?.code === "P2002") return;
      logger.warn({ err, campaignId }, "Failed to record campaign completion notification dedupe key");
      return;
    }

    // Send Slack notification
    const conn = await prisma.slackConnection.findFirst({
      where: { tenantId, disconnectedAt: null, channelId: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (!conn || !conn.channelId) return; // No Slack connected — skip silently

    const token = decryptSecret(conn.accessTokenEncrypted);
    const emoji = hasFailed ? "⚠️" : "✅";
    const text = [
      `${emoji} *Campaign completed*`,
      `📊 Results: ${sent} sent, ${failed} failed, ${cancelled} cancelled (${total} total)`,
    ].join("\n");

    await postSlackMessage(token, conn.channelId, text);
  } catch (err) {
    logger.warn({ err, campaignId }, "Campaign completion notification failed (non-fatal)");
  }
}
