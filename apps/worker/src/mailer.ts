import nodemailer from "nodemailer";
import { decryptSecret } from "./crypto";

const transportCache = new Map<string, nodemailer.Transporter>();

export interface SenderSmtpConfig {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassEncrypted: string;
}

function getTransport(sender: SenderSmtpConfig) {
  const cached = transportCache.get(sender.id);
  if (cached) return cached;

  const transport = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: sender.smtpPort === 465,
    auth: { user: sender.smtpUser, pass: decryptSecret(sender.smtpPassEncrypted) },
  });
  transportCache.set(sender.id, transport);
  return transport;
}

export interface SendResult {
  providerMessageId: string;
  previewUrl: string | null;
}

/**
 * Ethereal (https://ethereal.email) is Nodemailer's fake-SMTP testing
 * service: messages are accepted and given a shareable preview URL, but
 * nothing is ever delivered to a real inbox. It is NOT a production email
 * provider — swapping SMTP_HOST/creds for a real provider (SES, Postmark,
 * etc.) is the only change needed to go live, since everything downstream
 * only depends on the standard SMTP transport contract.
 */
export async function sendMail(sender: SenderSmtpConfig, to: string, subject: string, html: string): Promise<SendResult> {
  const transport = getTransport(sender);
  const info = await transport.sendMail({
    from: sender.smtpUser,
    to,
    subject,
    html,
  });

  return {
    providerMessageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
