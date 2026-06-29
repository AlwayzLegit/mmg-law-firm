import "server-only";

import { FIRM } from "@/lib/constants";
import { env } from "@/lib/env";
import type { DailyAgenda } from "@/lib/data/daily-agenda";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function time(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Render the daily agenda as a self-contained HTML email. */
export function renderDailyAgendaEmail(agenda: DailyAgenda): {
  subject: string;
  html: string;
} {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const todayUrl = `${base}/admin/today`;

  const counts =
    agenda.overdueTasks.length +
    agenda.todayTasks.length +
    agenda.followUps.length +
    agenda.newLeads.length;
  const subject = `${FIRM.legalName} — today: ${agenda.overdueTasks.length} overdue, ${agenda.todayTasks.length} due, ${agenda.followUps.length} follow-ups, ${agenda.newLeads.length} new`;

  const taskRow = (title: string, dueAt: string | null, overdue: boolean) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a">${esc(
      title,
    )}</td><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:${
      overdue ? "#dc2626" : "#64748b"
    }">${overdue ? "overdue · " : ""}${esc(time(dueAt))}</td></tr>`;

  const leadRow = (id: string, name: string, at: string) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px"><a href="${base}/admin/leads/${id}" style="color:#2b46d8;text-decoration:none">${esc(
      name,
    )}</a></td><td style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:right;color:#64748b">${esc(
      time(at),
    )}</td></tr>`;

  const section = (heading: string, rowsHtml: string, count: number) =>
    count === 0
      ? ""
      : `<div style="margin-top:22px">
          <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">${esc(
            heading,
          )} (${count})</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
        </div>`;

  const overdueHtml = section(
    "Overdue tasks",
    agenda.overdueTasks.map((t) => taskRow(t.title, t.dueAt, true)).join(""),
    agenda.overdueTasks.length,
  );
  const todayHtml = section(
    "Tasks due today",
    agenda.todayTasks.map((t) => taskRow(t.title, t.dueAt, false)).join(""),
    agenda.todayTasks.length,
  );
  const followUpHtml = section(
    "Follow-ups due",
    agenda.followUps.map((l) => leadRow(l.id, l.firstName, l.at)).join(""),
    agenda.followUps.length,
  );
  const newHtml = section(
    "New & unassigned leads",
    agenda.newLeads.map((l) => leadRow(l.id, l.firstName, l.at)).join(""),
    agenda.newLeads.length,
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="padding:24px 28px;background:#2b46d8">
      <div style="color:#fff;font-size:18px;font-weight:600">${esc(FIRM.legalName)}</div>
      <div style="color:#c7d2fe;font-size:13px;margin-top:2px">Your agenda — ${esc(today)}</div>
    </div>
    <div style="padding:24px 28px">
      ${
        counts === 0
          ? `<p style="font-size:14px;color:#0f172a">Nothing due and no new intake. Have a clear day.</p>`
          : overdueHtml + todayHtml + followUpHtml + newHtml
      }
      <div style="margin-top:28px;text-align:center">
        <a href="${todayUrl}" style="display:inline-block;background:#2b46d8;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px">Open Today in the admin</a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:11px;text-align:center">
      Internal agenda for ${esc(FIRM.legalName)}. Contains task titles and lead first names only.
    </div>
  </div>
</div>`;

  return { subject, html };
}
