import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";

// Mock the Slack client so no real HTTP calls happen
vi.mock("../slack/client", () => ({
  postSlackMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock crypto for decryptSecret
vi.mock("../crypto", () => ({
  decryptSecret: vi.fn().mockReturnValue("mock-bot-token"),
}));

import { checkCampaignCompletionAndNotify } from "./campaignNotifier";
import { postSlackMessage } from "./client";

function mockPrisma(overrides: Record<string, unknown> = {}) {
  return {
    emailJob: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([
        { status: "SENT", _count: { _all: 5 } },
        { status: "FAILED", _count: { _all: 1 } },
      ]),
    },
    campaign: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    campaignEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    notificationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    slackConnection: {
      findFirst: vi.fn().mockResolvedValue({
        id: "conn-1",
        tenantId: "tenant-1",
        teamId: "T123",
        teamName: "TestTeam",
        accessTokenEncrypted: "encrypted",
        channelId: "C123",
        channelName: "general",
        disconnectedAt: null,
      }),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("checkCampaignCompletionAndNotify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends Slack notification when all campaign jobs are done", async () => {
    const prisma = mockPrisma();
    await checkCampaignCompletionAndNotify(prisma, "campaign-1", "tenant-1");

    expect(prisma.emailJob.count).toHaveBeenCalledOnce();
    expect(prisma.campaign.updateMany).toHaveBeenCalledOnce();
    expect(prisma.notificationLog.create).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledOnce();
    expect(postSlackMessage).toHaveBeenCalledWith(
      "mock-bot-token",
      "C123",
      expect.stringContaining("Campaign completed"),
    );
  });

  it("does not notify when jobs are still active", async () => {
    const prisma = mockPrisma({
      emailJob: {
        count: vi.fn().mockResolvedValue(3), // 3 still active
        groupBy: vi.fn(),
      },
    });

    await checkCampaignCompletionAndNotify(prisma, "campaign-1", "tenant-1");
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("deduplicates notifications via NotificationLog unique constraint", async () => {
    const prisma = mockPrisma({
      notificationLog: {
        create: vi.fn().mockRejectedValue({ code: "P2002" }), // unique constraint violation
      },
    });

    await checkCampaignCompletionAndNotify(prisma, "campaign-1", "tenant-1");
    // Should skip Slack call because dedup key already exists
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("skips Slack notification when no workspace is connected", async () => {
    const prisma = mockPrisma({
      slackConnection: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });

    await checkCampaignCompletionAndNotify(prisma, "campaign-1", "tenant-1");
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("never throws even if Slack API fails", async () => {
    (postSlackMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Slack error"));
    const prisma = mockPrisma();

    // Should not throw
    await expect(
      checkCampaignCompletionAndNotify(prisma, "campaign-1", "tenant-1"),
    ).resolves.not.toThrow();
  });
});
