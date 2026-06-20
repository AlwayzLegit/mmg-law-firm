import "server-only";

import { FIRM } from "@/lib/constants";
import { env } from "@/lib/env";
import type { LeadAnalytics, Ranked } from "@/lib/data/lead-analytics";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function rankRows(rows: Ranked[]): string {
  if (rows.length === 0) {
    return `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">No data yet.</td></tr>`;
  }
  return rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${esc(
            r.label,
          )}</td>
          <td style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;text-align:right;font-weight:600">${r.count}</td>
        </tr>`,
    )
    .join("");
}

function deltaText(a: LeadAnalytics): string {
  if (a.weekOverWeekPct === null) {
    return `${a.last7} this week`;
  }
  const dir = a.weekOverWeekPct >= 0 ? "▲" : "▼";
  return `${a.last7} this week (${dir} ${Math.abs(a.weekOverWeekPct)}% vs ${a.prev7} prior)`;
}

/** Render the weekly lead digest as a self-contained HTML email. */
export function renderLeadDigestEmail(a: LeadAnalytics): {
  subject: string;
  html: string;
} {
  const adminUrl = `${env.NEXT_PUBLIC_SITE_URL}/admin/analytics`;
  const subject = `${FIRM.legalName} — weekly leads: ${a.last7} new, ${a.signed} signed (30d)`;

  const kpi = (label: string, value: string | number, hint: string) =>
    `<td style="padding:12px 16px;background:#f8fafc;border-radius:10px;width:50%;vertical-align:top">
      <div style="font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#64748b;font-weight:600">${label}</div>
      <div style="font-size:26px;font-weight:600;color:#0f172a;margin-top:2px">${value}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">${hint}</div>
    </td>`;

  const html = `<!doctype html><html><body style="margin:0;background:#eef2f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="padding:24px 28px;background:#2b46d8">
      <div style="color:#fff;font-size:18px;font-weight:600">${esc(FIRM.legalName)}</div>
      <div style="color:#c7d2fe;font-size:13px;margin-top:2px">Weekly lead report — last 30 days</div>
    </div>
    <div style="padding:24px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="border-collapse:separate">
        <tr>
          ${kpi("This week", deltaText(a), "non-spam leads")}
          ${kpi("Conversion", `${a.conversionPct}%`, "signed ÷ real leads (30d)")}
        </tr>
        <tr>
          ${kpi("Leads (30d)", a.qualifiedTotal, "spam excluded")}
          ${kpi("Signed (30d)", a.signed, "retained clients")}
        </tr>
      </table>

      <h3 style="font-size:14px;color:#0f172a;margin:24px 0 4px">Lead source</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rankRows(a.bySource)}</table>

      <h3 style="font-size:14px;color:#0f172a;margin:24px 0 4px">Practice area</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rankRows(a.byPracticeArea)}</table>

      <h3 style="font-size:14px;color:#0f172a;margin:24px 0 4px">Top counties</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rankRows(a.byCounty)}</table>

      <div style="margin-top:28px;text-align:center">
        <a href="${adminUrl}" style="display:inline-block;background:#2b46d8;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px">Open the dashboard</a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:11px;text-align:center">
      Internal report — contains lead counts only, no client PII. ${esc(FIRM.legalName)}.
    </div>
  </div>
</body></html>`;

  return { subject, html };
}
