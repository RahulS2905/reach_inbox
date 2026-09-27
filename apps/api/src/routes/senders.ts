import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import { encryptSecret } from "../crypto";

export const sendersRouter = Router();
sendersRouter.use(requireAuth);

sendersRouter.get("/", async (req, res, next) => {
  try {
    const senders = await prisma.senderAccount.findMany({
      where: { tenantId: req.tenantId! },
      select: {
        id: true,
        label: true,
        smtpHost: true,
        smtpUser: true,
        maxEmailsPerHour: true,
        minSendIntervalMs: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ items: senders });
  } catch (err) {
    next(err);
  }
});

const CreateSenderSchema = z.object({
  label: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  maxEmailsPerHour: z.number().int().min(1).default(200),
  minSendIntervalMs: z.number().int().min(0).default(2000),
});

sendersRouter.post("/", async (req, res, next) => {
  try {
    const input = CreateSenderSchema.parse(req.body);
    const sender = await prisma.senderAccount.create({
      data: {
        tenantId: req.tenantId!,
        label: input.label,
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUser: input.smtpUser,
        smtpPassEncrypted: encryptSecret(input.smtpPass),
        maxEmailsPerHour: input.maxEmailsPerHour,
        minSendIntervalMs: input.minSendIntervalMs,
      },
      select: { id: true, label: true },
    });
    res.status(201).json(sender);
  } catch (err) {
    next(err);
  }
});
