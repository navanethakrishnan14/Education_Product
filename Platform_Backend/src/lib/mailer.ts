import nodemailer from "nodemailer";
import { env } from "../config/env";

export function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
}

export async function sendPasswordSetupEmail(input: { to: string; organizationName: string; setupUrl: string }) {
  if (!isEmailConfigured()) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in Platform_Backend/.env.");
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: "Set up your EduSphere organization password",
    text: `Welcome to EduSphere, ${input.organizationName}. Set your password using this one-time link (expires in 30 minutes): ${input.setupUrl}\n\nIf you did not expect this email, you can ignore it.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Welcome to EduSphere</h2><p>Your organization <strong>${escapeHtml(input.organizationName)}</strong> has been registered.</p><p>Use the button below to set a password for the official organization account. This link expires in 30 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${escapeHtml(input.setupUrl)}" style="background:#176b5b;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set Password</a></p><p>If the button does not work, copy this link into your browser:</p><p style="word-break:break-all">${escapeHtml(input.setupUrl)}</p><p style="color:#64748b;font-size:12px">If you did not expect this email, you can safely ignore it.</p></div>`
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
