import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function logCampaignEvent(data: {
  tenantId: string;
  campaignId: string;
  emailJobId?: string;
  eventType: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.campaignEvent.create({
    data: {
      tenantId: data.tenantId,
      campaignId: data.campaignId,
      emailJobId: data.emailJobId,
      eventType: data.eventType,
      message: data.message,
      metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
