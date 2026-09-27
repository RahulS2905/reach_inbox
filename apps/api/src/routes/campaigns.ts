import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import type { CampaignDTO } from "@reachinbox/shared";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);

const ACTIVE_STATUSES = ["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"] as const;

campaignsRouter.get("/", async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: req.tenantId! },
      include: { senderAccount: { select: { label: true } } },
      orderBy: { createdAt: "desc" },
    });

    const dtos: CampaignDTO[] = await Promise.all(
      campaigns.map(async (c) => {
        const [grouped, next] = await Promise.all([
          prisma.emailJob.groupBy({
            by: ["status"],
            where: { campaignId: c.id },
            _count: { _all: true },
          }),
          prisma.emailJob.aggregate({
            where: { campaignId: c.id, status: { in: [...ACTIVE_STATUSES] } },
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
          nextScheduledFor: next._min.scheduledFor ? next._min.scheduledFor.toISOString() : null,
        };
      }),
    );

    res.json({ items: dtos });
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get("/:id", async (req, res, next) => {
  try {
    const c = await prisma.campaign.findUnique({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: { senderAccount: { select: { label: true } } },
    });

    if (!c) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Campaign not found" } });
    }

    const [grouped, nextJob] = await Promise.all([
      prisma.emailJob.groupBy({
        by: ["status"],
        where: { campaignId: c.id },
        _count: { _all: true },
      }),
      prisma.emailJob.aggregate({
        where: { campaignId: c.id, status: { in: [...ACTIVE_STATUSES] } },
        _min: { scheduledFor: true },
      }),
    ]);

    const countFor = (statuses: string[]) =>
      grouped.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);

    const dto = {
      id: c.id,
      name: c.name,
      subject: c.subject,
      body: c.body,
      senderLabel: c.senderAccount.label,
      status: c.status,
      totalRecipients: c.totalRecipients,
      queued: countFor(["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"]),
      sent: countFor(["SENT"]),
      failed: countFor(["FAILED"]),
      startTime: c.startTime.toISOString(),
      delayMs: c.delayMs,
      hourlyLimit: c.hourlyLimit,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      nextScheduledFor: nextJob._min.scheduledFor ? nextJob._min.scheduledFor.toISOString() : null,
    };

    res.json(dto);
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get("/:id/events", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 25;
    const skip = (page - 1) * pageSize;

    const [events, total] = await Promise.all([
      prisma.campaignEvent.findMany({
        where: { campaignId: req.params.id, tenantId: req.tenantId! },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.campaignEvent.count({
        where: { campaignId: req.params.id, tenantId: req.tenantId! },
      })
    ]);

    const dtos = events.map(e => ({
      id: e.id,
      campaignId: e.campaignId,
      emailJobId: e.emailJobId,
      eventType: e.eventType,
      message: e.message,
      metadata: e.metadata as Record<string, unknown>,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({ items: dtos, page, pageSize, total });
  } catch (err) {
    next(err);
  }
});

campaignsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if campaign exists and belongs to tenant
    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: req.tenantId! }
    });
    if (!campaign) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Campaign not found" } });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: { status: "CANCELLED" }
    });

    // Update all pending jobs
    const updated = await prisma.emailJob.updateMany({
      where: { 
        campaignId: id,
        tenantId: req.tenantId!,
        status: { in: [...ACTIVE_STATUSES] } 
      },
      data: { status: "CANCELLED" }
    });

    // Log the event
    await prisma.campaignEvent.create({
      data: {
        tenantId: req.tenantId!,
        campaignId: id,
        eventType: "cancelled",
        message: `Campaign cancelled, ${updated.count} pending jobs cancelled.`
      }
    });

    res.json({ message: "Campaign cancelled", cancelledJobsCount: updated.count });
  } catch (err) {
    next(err);
  }
});
