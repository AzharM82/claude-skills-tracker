import nodemailer from "nodemailer";
import type { SkillEntity } from "./tableClient.js";

interface WeeklyDigestInput {
  weekStart: string;
  weekEnd: string;
  highlight: string;
  newSkills: SkillEntity[];
  siteUrl: string;
  totalTracked: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDigestHtml(input: WeeklyDigestInput): string {
  const rows = input.newSkills
    .map(
      (s) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #24282e;vertical-align:top;">
            <a href="${escapeHtml(s.repoUrl)}" style="color:#8ab4ff;text-decoration:none;font-weight:600;">${escapeHtml(s.title)}</a>
            <div style="color:#8a8f98;font-size:12px;margin-top:2px;">${escapeHtml(s.author)} &middot; ${s.stars} ★</div>
          </td>
          <td style="padding:10px;border-bottom:1px solid #24282e;vertical-align:top;color:#d6d8dc;font-size:14px;">
            ${escapeHtml(s.description)}
          </td>
        </tr>`,
    )
    .join("");

  const emptyState = `<tr><td colspan="2" style="padding:20px;text-align:center;color:#8a8f98;">No new skills discovered this week.</td></tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0b0d10;color:#e6e8eb;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:680px;margin:0 auto;">
      <h1 style="margin:0 0 4px;font-size:22px;">Claude Code Skills — Weekly Digest</h1>
      <div style="color:#8a8f98;font-size:13px;margin-bottom:20px;">
        ${escapeHtml(input.weekStart)} → ${escapeHtml(input.weekEnd)} &middot; ${input.totalTracked} skills tracked in total
      </div>

      <div style="background:#141821;border:1px solid #24282e;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
        <div style="color:#8ab4ff;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">This week's highlight</div>
        <div style="font-size:15px;line-height:1.55;">${escapeHtml(input.highlight).replace(/\n/g, "<br/>")}</div>
      </div>

      <div style="color:#8a8f98;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;margin:20px 0 8px;">
        New skills (${input.newSkills.length})
      </div>
      <table style="width:100%;border-collapse:collapse;background:#141821;border:1px solid #24282e;border-radius:10px;overflow:hidden;">
        ${input.newSkills.length === 0 ? emptyState : rows}
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="${escapeHtml(input.siteUrl)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View full tracker →</a>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendWeeklyDigestEmail(input: WeeklyDigestInput): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.DIGEST_TO_EMAIL;
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured");
  if (!to) throw new Error("DIGEST_TO_EMAIL not configured");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject: `Claude Code Skills — ${input.newSkills.length} new this week`,
    html: renderDigestHtml(input),
  });
}
