import "server-only";

import { FIRM } from "@/lib/constants";
import type { WaitingLead } from "@/lib/data/daily-agenda";
import { env } from "@/lib/env";
import { SLA_TARGET_MINUTES, formatAge } from "@/lib/leads/sla";

const INK = "#12171b";
const BRONZE = "#8a5a1c";
const MUTED = "#64748b";
const RULE = "#efe9df";
const RED = "#b42318";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Email + SMS for leads that have crossed the first-response target without
 * anyone acting on them. First names only — the admin link carries the rest.
 */
export function renderSlaAlert(leads: WaitingLead[]): {
  subject: string;
  html: string;
  sms: string;
} {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const n = leads.length;
  const oldest = leads[0];
  const plural = n === 1 ? "lead" : "leads";

  const subject = `⏱ ${n} ${plural} waiting for a first call — oldest ${
    oldest ? formatAge(oldest.minutes) : ""
  }`;

  const rows = leads
    .map(
      (l) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid ${RULE};font-size:14px"><a href="${base}/admin/leads/${l.id}" style="color:${BRONZE};text-decoration:none;font-weight:600">${esc(
          l.firstName,
        )}</a>${l.assigned ? "" : `<span style="color:${MUTED};font-size:12px"> · unassigned</span>`}</td><td style="padding:7px 0;border-bottom:1px solid ${RULE};font-size:12px;text-align:right;white-space:nowrap;color:${RED}">waiting ${esc(
          formatAge(l.minutes),
        )}</td></tr>`,
    )
    .join("");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8f4ed;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid ${RULE}">
    <div style="padding:20px 28px;background:${INK}">
      <div style="color:#fff;font-size:18px;font-weight:600">${esc(FIRM.legalName)}</div>
      <div style="color:#e8c384;font-size:13px;margin-top:2px">Speed-to-lead alert</div>
    </div>
    <div style="padding:24px 28px">
      <p style="font-size:14px;color:${INK};margin:0 0 12px">${n} ${plural} ${
        n === 1 ? "has" : "have"
      } been waiting more than ${SLA_TARGET_MINUTES} minutes for a first call. The first firm to call usually signs the case.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <div style="margin-top:24px;text-align:center">
        <a href="${base}/admin/today" style="display:inline-block;background:${INK};color:#e8c384;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px">Open Today in the admin</a>
      </div>
    </div>
    <div style="padding:14px 28px;border-top:1px solid ${RULE};color:#94a3b8;font-size:11px;text-align:center">
      One alert per lead. The weekday agenda email lists anything still waiting.
    </div>
  </div>
</div>`;

  const names = leads
    .slice(0, 3)
    .map((l) => `${l.firstName} (${formatAge(l.minutes)})`)
    .join(", ");
  const more = n > 3 ? ` +${n - 3} more` : "";
  const sms = `${FIRM.legalName}: ${n} ${plural} waiting for a first call — ${names}${more}. ${base}/admin/today`;

  return { subject, html, sms };
}
