import crypto from "node:crypto";
import { prisma } from "../prisma";
import { Errors } from "../http/errors";
import { claimIdempotencyKey, completeIdempotency, hashRequestBody } from "./idempotency";
import { relayPendingOutboxEvents } from "./outbox";
import type { ScheduleEmailRequest } from "@reachinbox/shared";

export interface ScheduleResult {
  campaignId: string;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: string[];
  duplicatesRemoved: number;
}

export async function scheduleCampaign(
  tenantId: string,
  idempotencyKey: string,
  input: ScheduleEmailRequest,
  recipients: { valid: string[]; invalid: string[]; duplicatesRemoved: number },
): Promise<ScheduleResult> {
  const requestHash = hashRequestBody({ input, recipients: recipients.valid });

  const result = await prisma.$transaction(async (tx) => {
    const claim = await claimIdempotencyKey(tx, tenantId, idempotencyKey, requestHash);
    if (claim.replay) {
      return claim.responseBody as ScheduleResult;
    }

    const sender = await tx.senderAccount.findFirst({
      where: { id: input.senderAccountId, tenantId },
    });
    if (!sender) throw Errors.badRequest("Unknown senderAccountId for this tenant");

    if (recipients.valid.length === 0) {
      throw Errors.badRequest("No valid recipient addresses in the request", {
        invalid: recipients.invalid,
      });
    }

    const campaign = await tx.campaign.create({
      data: {
        tenantId,
        senderAccountId: sender.id,
        name: input.subject, // default name to subject since it's not in the request yet
        subject: input.subject,
        body: input.body,
        startTime: new Date(input.startTime),
        delayMs: input.delayMs,
        hourlyLimit: input.hourlyLimit,
        status: "ACTIVE",
        totalRecipients: recipients.valid.length,
      },
    });

    await tx.campaignEvent.create({
      data: {
        tenantId,
        campaignId: campaign.id,
        eventType: "scheduled",
        message: `Campaign scheduled with ${recipients.valid.length} recipients`,
      }
    });

    const startTimeMs = new Date(input.startTime).getTime();
    const jobRows = recipients.valid.map((recipient, index) => ({
      id: crypto.randomUUID(),
      tenantId,
      campaignId: campaign.id,
      senderAccountId: sender.id,
      recipient,
      subject: input.subject,
      body: input.body,
      // Requested spacing between sends, preserving list order. The actual
      // send time can still slip later at the worker if the sender's hourly
      // quota is exhausted (see rate limiter / reschedule logic).
      scheduledFor: new Date(startTimeMs + index * input.delayMs),
      status: "PENDING" as const,
    }));

    await tx.emailJob.createMany({ data: jobRows });

    await tx.outboxEvent.createMany({
      data: jobRows.map((row) => ({
        tenantId,
        eventType: "email_job.schedule",
        payload: { emailJobId: row.id, senderAccountId: row.senderAccountId },
      })),
    });

    // A second, independent outbox stream drives Elasticsearch indexing so a
    // slow/unavailable ES cluster can never block or lose email scheduling.
    await tx.outboxEvent.createMany({
      data: jobRows.map((row) => ({
        tenantId,
        eventType: "email_job.index",
        payload: { emailJobId: row.id },
      })),
    });

    const response: ScheduleResult = {
      campaignId: campaign.id,
      totalRecipients: recipients.valid.length,
      validRecipients: recipients.valid.length,
      invalidRecipients: recipients.invalid,
      duplicatesRemoved: recipients.duplicatesRemoved,
    };

    await completeIdempotency(tx, tenantId, idempotencyKey, response);
    return response;
  });

  // Best-effort immediate relay so jobs hit BullMQ without waiting for the
  // sweep interval. If this process crashes right here, the row-level
  // `outbox-sweep` repeatable job (worker side) picks up any still-PENDING
  // OutboxEvent rows and relays them — nothing is lost, just delayed.
  relayPendingOutboxEvents(tenantId).catch(() => undefined);

  return result;
}
