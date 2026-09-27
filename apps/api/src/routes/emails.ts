import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { uploadRecipients } from "../middleware/upload";
import { prisma } from "../prisma";
import { Errors } from "../http/errors";
import { parseRecipientList } from "../utils/csv";
import { scheduleCampaign } from "../services/scheduling";
import { emailQueue } from "../queue/emailQueue";
import {
  ScheduleEmailRequestSchema,
  PaginationQuerySchema,
  type EmailJobDTO,
  type Paginated,
} from "@reachinbox/shared";

export const emailsRouter = Router();
emailsRouter.use(requireAuth);

const ScheduleFormFieldsSchema = ScheduleEmailRequestSchema.omit({ recipients: true });

emailsRouter.post("/schedule", uploadRecipients.single("recipients"), async (req, res, next) => {
  try {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) throw Errors.badRequest("Idempotency-Key header is required");
    if (!req.file) throw Errors.badRequest("A recipients CSV/TXT file is required");

    const fields = ScheduleFormFieldsSchema.parse({
      senderAccountId: req.body.senderAccountId,
      subject: req.body.subject,
      body: req.body.body,
      startTime: req.body.startTime,
      delayMs: req.body.delayMs !== undefined ? Number(req.body.delayMs) : undefined,
      hourlyLimit: req.body.hourlyLimit !== undefined ? Number(req.body.hourlyLimit) : undefined,
    });

    const recipients = parseRecipientList(req.file.buffer.toString("utf8"));

    const result = await scheduleCampaign(
      req.tenantId!,
      idempotencyKey,
      { ...fields, recipients: recipients.valid },
      recipients,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

function toDTO(job: {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  scheduledFor: Date;
  status: string;
  attemptCount: number;
  lastError: string | null;
  providerMessageId: string | null;
  previewUrl: string | null;
  sentAt: Date | null;
  senderAccount: { label: string };
}): EmailJobDTO {
  return {
    id: job.id,
    campaignId: job.campaignId,
    recipient: job.recipient,
    subject: job.subject,
    senderLabel: job.senderAccount.label,
    scheduledFor: job.scheduledFor.toISOString(),
    status: job.status as EmailJobDTO["status"],
    attemptCount: job.attemptCount,
    lastError: job.lastError,
    providerMessageId: job.providerMessageId,
    previewUrl: job.previewUrl,
    sentAt: job.sentAt ? job.sentAt.toISOString() : null,
  };
}

async function listJobs(
  tenantId: string,
  scope: "scheduled" | "sent",
  query: z.infer<typeof PaginationQuerySchema>,
): Promise<Paginated<EmailJobDTO>> {
  const statusFilter =
    query.status !== undefined
      ? { status: query.status as never }
      : scope === "scheduled"
        ? { status: { in: ["PENDING", "QUEUED", "RESERVED", "SENDING", "RESCHEDULED"] as never } }
        : { status: { in: ["SENT", "FAILED"] as never } };

  const where = {
    tenantId,
    ...statusFilter,
    ...(query.search
      ? {
          OR: [
            { recipient: { contains: query.search, mode: "insensitive" as const } },
            { subject: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      include: { senderAccount: { select: { label: true } } },
      orderBy: { [query.sort]: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.emailJob.count({ where }),
  ]);

  return { items: items.map(toDTO), page: query.page, pageSize: query.pageSize, total };
}

emailsRouter.get("/scheduled", async (req, res, next) => {
  try {
    const query = PaginationQuerySchema.parse(req.query);
    res.json(await listJobs(req.tenantId!, "scheduled", query));
  } catch (err) {
    next(err);
  }
});

emailsRouter.get("/sent", async (req, res, next) => {
  try {
    const query = PaginationQuerySchema.parse(req.query);
    res.json(await listJobs(req.tenantId!, "sent", query));
  } catch (err) {
    next(err);
  }
});

emailsRouter.get("/:id", async (req, res, next) => {
  try {
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
      include: { senderAccount: { select: { label: true } } },
    });
    if (!job) throw Errors.notFound("Email job not found");
    res.json(toDTO(job));
  } catch (err) {
    next(err);
  }
});

emailsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });
    if (!job) throw Errors.notFound("Email job not found");
    if (["SENT", "SENDING", "CANCELLED"].includes(job.status)) {
      throw Errors.conflict(`Cannot cancel a job in status ${job.status}`);
    }

    if (job.bullJobId) {
      const bullJob = await emailQueue.getJob(job.bullJobId);
      await bullJob?.remove().catch(() => undefined);
    }

    await prisma.emailJob.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

emailsRouter.post("/:id/retry", async (req, res, next) => {
  try {
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });
    
    if (!job) throw Errors.notFound("Email job not found");
    if (job.status !== "FAILED") {
      throw Errors.conflict(`Only FAILED jobs can be retried. Current status is ${job.status}`);
    }

    // Reset status to PENDING and wipe error state
    await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.emailJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          lastError: null,
          bullJobId: null
        }
      });
      
      await tx.outboxEvent.create({
        data: {
          tenantId: req.tenantId!,
          eventType: "email_job.schedule",
          payload: {
            emailJobId: job.id,
            tenantId: req.tenantId!,
            senderAccountId: job.senderAccountId
          }
        }
      });
    });

    res.json({ message: "Job retried successfully" });
  } catch (err) {
    next(err);
  }
});

emailsRouter.post("/:id/reschedule", async (req, res, next) => {
  try {
    const { scheduledFor } = z.object({ scheduledFor: z.string().datetime() }).parse(req.body);
    
    const job = await prisma.emailJob.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });
    
    if (!job) throw Errors.notFound("Email job not found");
    if (["SENT", "SENDING", "CANCELLED"].includes(job.status)) {
      throw Errors.conflict(`Cannot reschedule a job in status ${job.status}`);
    }

    // If job was in queue, we must re-queue it. If it was PENDING, it hasn't hit queue yet.
    // The easiest robust way is to just set it to PENDING and write a new outbox event
    // with the new date. Wait, if it has a bullJobId, remove it.
    if (job.bullJobId) {
      const bullJob = await emailQueue.getJob(job.bullJobId);
      await bullJob?.remove().catch(() => undefined);
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          scheduledFor: new Date(scheduledFor),
          bullJobId: null
        }
      });
      
      await tx.outboxEvent.create({
        data: {
          tenantId: req.tenantId!,
          eventType: "email_job.schedule",
          payload: {
            emailJobId: job.id,
            tenantId: req.tenantId!,
            senderAccountId: job.senderAccountId
          }
        }
      });
    });

    res.json({ message: "Job rescheduled successfully" });
  } catch (err) {
    next(err);
  }
});
