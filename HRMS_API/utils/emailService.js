import nodemailer from "nodemailer";

let transporter;

const buildTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("SMTP configuration missing. Emails will be logged instead of sent.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  const activeTransporter = buildTransporter();

  if (!to) {
    console.warn("Email not sent. Missing recipient.");
    return { skipped: true, reason: "missing-recipient" };
  }

  if (!activeTransporter) {
    console.info("Email delivery skipped", { to, subject, text });
    return { skipped: true, reason: "missing-transport" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return activeTransporter.sendMail({ from, to, subject, text, html, attachments });
};
