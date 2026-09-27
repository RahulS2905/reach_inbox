import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import type { DashboardStatsDTO, CampaignDTO, CampaignEventDTO } from "@reachinbox/shared";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/dashboard", async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;

    const [
      totalCampaigns,
      emailStats,
      recentEventsData,
      upcomingCampaignsData
    ] = await Promise.all([
      prisma.campaign.count({ where: { tenantId } }),
      prisma.emailJob.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true }
      }),
      prisma.campaignEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.campaign.findMany({
        where: { tenantId, status: { in: ['ACTIVE', 'SCHEDULING'] } },
        orderBy: { startTime: 'asc' },
        take: 5,
        include: { senderAccount: { select: { label: true } } }
      })
    ]);

    const getCount = (statuses: string[]) => 
      emailStats.filter(s => statuses.includes(s.status)).reduce((sum, s) => sum + s._count._all, 0);

    const recentEvents: CampaignEventDTO[] = recentEventsData.map(e => ({
      id: e.id,
      campaignId: e.campaignId,
      emailJobId: e.emailJobId,
      eventType: e.eventType,
      message: e.message,
      metadata: e.metadata as Record<string, unknown>,
      createdAt: e.createdAt.toISOString()
    }));

    const upcomingCampaigns = await Promise.all(
      upcomingCampaignsData.map(async (c) => {
        const [grouped, nextJob] = await Promise.all([
          prisma.emailJob.groupBy({
            by: ["status"],
            where: { campaignId: c.id },
            _count: { _all: true },
          }),
          prisma.emailJob.aggregate({
            where: { campaignId: c.id, status: { in: ["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"] } },
            _min: { scheduledFor: true },
          }),
        ]);

        const countFor = (statuses: string[]) =>
          grouped.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);

        return {
          id: c.id,
          subject: c.subject,
          senderLabel: c.senderAccount.label,
          status: c.status,
          totalRecipients: c.totalRecipients,
          queued: countFor(["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"]),
          sent: countFor(["SENT"]),
          failed: countFor(["FAILED"]),
          startTime: c.startTime.toISOString(),
          nextScheduledFor: nextJob._min.scheduledFor ? nextJob._min.scheduledFor.toISOString() : null,
        } as CampaignDTO;
      })
    );

    const stats: DashboardStatsDTO = {
      totalCampaigns,
      scheduledEmails: getCount(["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"]),
      sentEmails: getCount(["SENT"]),
      failedEmails: getCount(["FAILED"]),
      deferredEmails: 0, // Not explicitly tracked in this model yet
      cancelledEmails: getCount(["CANCELLED"]),
      recentEvents,
      upcomingCampaigns
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
});
