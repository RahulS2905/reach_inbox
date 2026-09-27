import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  const tenant = await prisma.tenant.create({
    data: {
      name: "ReachInbox Dev",
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      googleId: "google-auth-dev-id",
      email: "dev@reachinbox.local",
      name: "Dev User",
    },
  });

  const sender = await prisma.senderAccount.create({
    data: {
      tenantId: tenant.id,
      label: "Dev SMTP Sender",
      smtpHost: "localhost",
      smtpPort: 1025,
      smtpUser: "dev",
      smtpPassEncrypted: "devpass",
      maxEmailsPerHour: 500,
      minSendIntervalMs: 1000,
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      senderAccountId: sender.id,
      name: "Welcome Series",
      subject: "Welcome to ReachInbox",
      body: "Hello, this is a test email from the dev environment.",
      startTime: new Date(),
      status: "ACTIVE",
      totalRecipients: 2,
    },
  });

  await prisma.campaignEvent.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      eventType: "scheduled",
      message: "Campaign scheduled with 2 recipients",
    }
  });

  const emailJob1 = await prisma.emailJob.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      senderAccountId: sender.id,
      recipient: "test1@example.com",
      subject: "Welcome to ReachInbox",
      body: "Hello, this is a test email from the dev environment.",
      scheduledFor: new Date(),
      status: "PENDING",
    },
  });

  const emailJob2 = await prisma.emailJob.create({
    data: {
      tenantId: tenant.id,
      campaignId: campaign.id,
      senderAccountId: sender.id,
      recipient: "test2@example.com",
      subject: "Welcome to ReachInbox",
      body: "Hello, this is a test email from the dev environment.",
      scheduledFor: new Date(Date.now() + 60000), // scheduled 1 min later
      status: "PENDING",
    },
  });

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
