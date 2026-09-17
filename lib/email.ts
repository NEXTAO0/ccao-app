import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface EmailInput {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  provider: "resend" | "smtp";
  error?: string;
}

// [MANUAL_SETUP_REQUIRED]: Resend API key from https://resend.com/api-keys (free tier).
const resendApiKey: string | undefined = process.env.RESEND_API_KEY;

// [MANUAL_SETUP_REQUIRED]: Verified sender address in Resend / SMTP (e.g. alerts@yourdomain.com).
const fromAddress: string =
  process.env.EMAIL_FROM ?? "CCAO Alerts <onboarding@resend.dev>";

// [MANUAL_SETUP_REQUIRED]: "resend" (default) or "smtp".
const provider: "resend" | "smtp" =
  process.env.EMAIL_PROVIDER === "smtp" ? "smtp" : "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(resendApiKey);
  return resendClient;
}

// [MANUAL_SETUP_REQUIRED]: Gmail SMTP settings. Used only when EMAIL_PROVIDER=smtp.
export const smtpConfig = {
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  user: process.env.SMTP_USER, // your Gmail address
  pass: process.env.SMTP_PASS, // 16-char Gmail App Password, never your real password
} as const;

/** Deduplicates recipients and drops obviously-invalid addresses. */
function normalizeRecipients(to: string[]): string[] {
  return [...new Set(to.map((addr) => addr.trim()).filter(Boolean))];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

/**
 * Sends an email via Resend (primary) or Nodemailer/Gmail SMTP (fallback).
 * Returns per-recipient result. Failures are reported, never thrown, so a
 * notification hiccup can't break the cost-check pipeline.
 */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const to = normalizeRecipients(input.to);
  if (to.length === 0) return { provider };

  try {
    if (provider === "smtp") {
      if (!smtpConfig.user || !smtpConfig.pass) {
        return {
          provider,
          error:
            "SMTP configured but SMTP_USER/SMTP_PASS are missing (see SETUP_GUIDE.md §4).",
        };
      }
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: true,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      });
      await transporter.sendMail({
        from: fromAddress,
        to: to.join(", "),
        subject: input.subject,
        html: input.html,
        text: input.text ?? input.html.replace(/<[^>]*>/g, "\n"),
      });
      return { provider };
    }

    const resend = getResend();
    if (!resend) {
      return {
        provider,
        error:
          "RESEND_API_KEY is missing. Either set it or switch EMAIL_PROVIDER=smtp (see .env.example).",
      };
    }
    const { data } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]*>/g, "\n"),
    });
    if (!data?.id) return { provider, error: "Resend returned no message id." };
    return { provider };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { provider, error: message };
  }
}

/** Plain, dependency-free HTML template shared by all CCAO notifications. */
export function buildAlertEmailHtml(opts: {
  title: string;
  message: string;
  budgetName: string;
  projectId: string;
  spend: string;
  threshold: string;
  action: string;
  dashboardUrl: string;
}): string {
  const accent = "#2563eb";
  const danger = "#dc2626";
  const title = escapeHtml(opts.title);
  const message = escapeHtml(opts.message);
  const budgetName = escapeHtml(opts.budgetName);
  const projectId = escapeHtml(opts.projectId);
  const spend = escapeHtml(opts.spend);
  const threshold = escapeHtml(opts.threshold);
  const action = escapeHtml(opts.action);
  const dashboardUrl = escapeHtml(opts.dashboardUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 40px -20px rgba(2,6,23,.25);">
          <tr>
            <td style="background:${accent};padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-.02em;">CCAO <span style="font-weight:400;opacity:.8;">· Cloud Controller by NEXTAO</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${danger};">${title}</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0b1220;line-height:1.3;">${message}</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Budget</td>
                        <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#0b1220;">${budgetName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Project</td>
                        <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#0b1220;"><code>${projectId}</code></td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Current spend</td>
                        <td align="right" style="padding:6px 0;font-size:15px;font-weight:800;color:${danger};">${spend}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Threshold</td>
                        <td align="right" style="padding:6px 0;font-size:13px;font-weight:600;color:#0b1220;">${threshold}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748b;">Action taken</td>
                        <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:${danger};">${action}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <a href="${dashboardUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">Open dashboard</a>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">Sent by CCAO. Free, open-source cloud cost control. <a href="${dashboardUrl}" style="color:#94a3b8;">Manage alerts</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}