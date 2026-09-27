import { DelayedError, type Job } from "bullmq";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { reserveSendSlot } from "../rateLimit/reserveSendSlot";
import { sendMail } from "../mailer";
import { notifyRateLimitHit } from "../slack/notifier";
import type { EmailJobPayload } from "@reachinbox/shared";

const HOUR_MS = 60 * 60 * 1000;

export async function processEmailSend(job: Job<EmailJobPayload>, token?: string) {
  const { emailJobId } = job.data;

  const current = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { senderAccount: true },
  });

  if (!current) {
    logger.warn({ emailJobId }, "EmailJob no longer exists (likely deleted); dropping job");
    return;
  }

  if (["SENT", "CANCELLED"].includes(current.status)) {
    // Already handled (possibly by another worker instance racing this same
    // stable jobId) — nothing to do. This is the idempotency backstop.
    return;
  }

  // Atomic conditional transition: only one caller can move a job out of
  // QUEUED/RESCHEDULED at a time. If this updates 0 rows, some other
  // worker process already claimed it — safe to no-op.
  const claim = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: { in: ["QUEUED", "RESCHEDULED"] } },
    data: { status: "RESERVED" },
  });
  if (claim.count === 0) {
    logger.info({ emailJobId }, "Job already claimed by another worker; skipping");
    return;
  }

  const sender = current.senderAccount;

  const reservation = await reserveSendSlot(sender.id, {
    minSendIntervalMs: sender.minSendIntervalMs,
    maxEmailsPerHour: sender.maxEmailsPerHour,
  });

  if (!reservation.allowed) {
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "RESCHEDULED", scheduledFor: new Date(reservation.retryAt) },
    });

    if (reservation.reason === "quota") {
      const windowStart = reservation.retryAt - HOUR_MS;
      notifyRateLimitHit(prisma, current.tenantId, sender.id, sender.label, windowStart).catch((err) =>
        logger.warn({ err }, "Rate-limit Slack notification failed (non-fatal)"),
      );
    }

    // Re-delay this exact job (same id => still idempotent) to the moment
    // it becomes allowed again. retryAt strictly increases in wall-clock
    // time (next interval tick, or the next hour's window boundary), so
    // this cannot loop forever — worst case it drains one at a time as the
    // hourly quota renews.
    if (token) {
      await job.moveToDelayed(reservation.retryAt, token);
      throw new DelayedError();
    }
    // No lock token (e.g. a unit test calling this directly) — caller is
    // responsible for re-enqueuing; just leave the DB state as RESCHEDULED.
    return;
  }

  await prisma.emailJob.update({
    where: { id: emailJobId },
    data: { status: "SENDING", attemptCount: { increment: 1 } },
  });

  try {
    const result = await sendMail(
      {
        id: sender.id,
        smtpHost: sender.smtpHost,
        smtpPort: sender.smtpPort,
        smtpUser: sender.smtpUser,
        smtpPassEncrypted: sender.smtpPassEncrypted,
      },
      current.recipient,
      current.subject,
      current.body,
    );

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
        previewUrl: result.previewUrl,
        lastError: null,
      },
    });
    await prisma.outboxEvent.create({
      data: { tenantId: current.tenantId, eventType: "email_job.index", payload: { emailJobId } },
    });
  } catch (err) {
    // Leave status as SENDING->will be corrected by the `failed` handler if
    // BullMQ exhausts retries; on a transient error we just rethrow so
    // BullMQ's configured attempts/backoff retries the job (still under the
    // same stable jobId).
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "QUEUED", lastError: String(err) },
    });
    throw err;
  }
}
