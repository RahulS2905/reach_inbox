import nodemailer from "nodemailer";

async function main() {
  const account = await nodemailer.createTestAccount();
  // eslint-disable-next-line no-console
  console.log(`
Ethereal test account created. Add these to your .env / SenderAccount:

  SMTP_HOST=${account.smtp.host}
  SMTP_PORT=${account.smtp.port}
  SMTP_USER=${account.user}
  SMTP_PASS=${account.pass}

(Sign in at https://ethereal.email using the same user/pass to view the inbox.)
`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to create Ethereal account:", err);
  process.exit(1);
});
