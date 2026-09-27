import { Router } from "express";
import { z } from "zod";
import nodemailer from "nodemailer";
import { requireAuth } from "../middleware/requireAuth";
import { prisma } from "../prisma";
import { encryptSecret } from "../crypto";
import { Errors } from "../http/errors";

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
        smtpPort: true,
        smtpUser: true,
        maxEmailsPerHour: true,
        minSendIntervalMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const items = senders.map((s) => ({
      ...s,
      isTestSender: s.smtpHost.toLowerCase().includes("ethereal.email"),
    }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

const VerifySenderSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
});

sendersRouter.post("/verify", async (req, res, next) => {
  try {
    const input = VerifySenderSchema.parse(req.body);
    const transporter = nodemailer.createTransport({
      host: input.smtpHost,
      port: input.smtpPort,
      secure: input.smtpPort === 465,
      auth: { user: input.smtpUser, pass: input.smtpPass },
      connectionTimeout: 10_000,
    });

    await transporter.verify();
    res.json({ ok: true, message: "SMTP connection verified successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SMTP connection failed";
    res.status(400).json({ ok: false, error: message });
  }
});

const CreateSenderSchema = z.object({
  label: z.string().min(1).max(100),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1),
  smtpPass: z.string().min(1),
  maxEmailsPerHour: z.coerce.number().int().min(1).default(200),
  minSendIntervalMs: z.coerce.number().int().min(0).default(2000),
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
      select: {
        id: true,
        label: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        maxEmailsPerHour: true,
        minSendIntervalMs: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      ...sender,
      isTestSender: sender.smtpHost.toLowerCase().includes("ethereal.email"),
    });
  } catch (err) {
    next(err);
  }
});

sendersRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const sender = await prisma.senderAccount.findFirst({
      where: { id, tenantId: req.tenantId! },
    });

    if (!sender) throw Errors.notFound("Sender account not found");

    const activeCampaigns = await prisma.campaign.count({
      where: { senderAccountId: id, status: { in: ["ACTIVE", "SCHEDULING"] } },
    });

    if (activeCampaigns > 0) {
      throw Errors.badRequest("Cannot delete a sender account assigned to an active campaign");
    }

    await prisma.senderAccount.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
