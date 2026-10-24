import "server-only";

import { FIRM } from "@/lib/constants";
import { env } from "@/lib/env";
import type { DailyAgenda } from "@/lib/data/daily-agenda";
import { describeDaysLeft } from "@/lib/leads/limitations";
import { SLA_WARN_MINUTES, formatAge } from "@/lib/leads/sla";

// Admin palette (see .theme-admin in globals.css): charcoal, bronze, ivory.
const INK = "#12171b";
const BRONZE = "#8a5a1c";
const MUTED = "#64748b";
const RULE = "#efe9df";
const RED = "#b42318";
const AMBER = "#b54708";

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

function day(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const cell = (extra = "") =>
  `padding:7px 0;border-bottom:1px solid ${RULE};font-size:14px;color:${INK};${extra}`;
const right = (color = MUTED) =>
  `padding:7px 0;border-bottom:1px solid ${RULE};font-size:12px;text-align:right;white-space:nowrap;color:${color}`;

/** Subject line: the waiting queue first, since that is the number that costs cases. */
export function agendaSubject(agenda: DailyAgenda): string {
  const parts: string[] = [];
  if (agenda.waiting.length) {
    parts.push(
      `${agenda.waiting.length} waiting for first call${
        agenda.breaches ? ` (${agenda.breaches} over 1h)` : ""
      }`,
    );
  }
  if (agenda.overdueTasks.length) parts.push(`${agenda.overdueTasks.length} overdue`);
  if (agenda.todayTasks.length) parts.push(`${agenda.todayTasks.length} due`);
  if (agenda.followUps.length) parts.push(`${agenda.followUps.length} follow-ups`);
  if (agenda.deadlines.length) parts.push(`${agenda.deadlines.length} deadlines`);
  return `${FIRM.legalName} — today: ${parts.length ? parts.join(", ") : "clear"}`;
}

/** Render the daily agenda as a self-contained HTML email. */
export function renderDailyAgendaEmail(
  agenda: DailyAgenda,
  now = Date.now(),
): {
  subject: string;
  html: string;
} {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const todayUrl = `${base}/admin/today`;
  const leadLink = (id: string, name: string) =>
    `<a href="${base}/admin/leads/${id}" style="color:${BRONZE};text-decoration:none;font-weight:600">${esc(name)}</a>`;

  const section = (heading: string, rowsHtml: string, count: number, note = "") =>
    count === 0
      ? ""
      : `<div style="margin-top:22px">
          <div style="font-size:13px;font-weight:600;color:${INK};margin-bottom:6px">${esc(
            heading,
          )} (${count})</div>
          ${note ? `<div style="font-size:12px;color:${MUTED};margin-bottom:6px">${esc(note)}</div>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
        </div>`;

  const waitingHtml = section(
    "Needs first response",
    agenda.waiting
      .map((l) => {
        const color = l.tone === "breach" ? RED : l.tone === "warn" ? AMBER : MUTED;
        const who = l.assigned ? "" : " · unassigned";
        return `<tr><td style="${cell()}">${leadLink(l.id, l.firstName)}<span style="color:${MUTED};font-size:12px">${who}</span></td><td style="${right(color)}">waiting ${esc(formatAge(l.minutes))}</td></tr>`;
      })
      .join(""),
    agenda.waiting.length,
    `Still in “new”. Anything over ${SLA_WARN_MINUTES} minutes is a likely lost case.`,
  );

  const taskRow = (title: string, dueAt: string | null, overdue: boolean) =>
    `<tr><td style="${cell()}">${esc(title)}</td><td style="${right(overdue ? RED : MUTED)}">${
      overdue ? "overdue · " : ""
    }${esc(time(dueAt))}</td></tr>`;

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
    agenda.followUps
      .map(
        (l) =>
          `<tr><td style="${cell()}">${leadLink(l.id, l.firstName)}</td><td style="${right()}">${esc(time(l.at))}</td></tr>`,
      )
      .join(""),
    agenda.followUps.length,
  );
  const deadlineHtml = section(
    "Statute deadlines within 6 months",
    agenda.deadlines
      .map((d) => {
        const color = d.tone === "ok" ? MUTED : d.tone === "warn" ? AMBER : RED;
        return `<tr><td style="${cell()}">${leadLink(d.id, d.firstName)}<span style="color:${MUTED};font-size:12px"> · ${esc(d.ruleLabel)}</span></td><td style="${right(color)}">${esc(day(d.date))} · ${esc(describeDaysLeft(d.daysLeft))}</td></tr>`;
      })
      .join(""),
    agenda.deadlines.length,
    "Estimates from the incident date. The attorney confirms the operative deadline.",
  );

  const today = new Date(now).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8f4ed;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid ${RULE}">
    <div style="padding:24px 28px;background:${INK}">
      <div style="color:#fff;font-size:18px;font-weight:600">${esc(FIRM.legalName)}</div>
      <div style="color:#e8c384;font-size:13px;margin-top:2px">Your agenda — ${esc(today)}</div>
    </div>
    <div style="padding:24px 28px">
      ${
        agenda.empty
          ? `<p style="font-size:14px;color:${INK}">Nothing waiting, nothing due. Have a clear day.</p>`
          : waitingHtml + overdueHtml + todayHtml + followUpHtml + deadlineHtml
      }
      <div style="margin-top:28px;text-align:center">
        <a href="${todayUrl}" style="display:inline-block;background:${INK};color:#e8c384;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:9px">Open Today in the admin</a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid ${RULE};color:#94a3b8;font-size:11px;text-align:center">
      Internal agenda for ${esc(FIRM.legalName)}. Contains task titles and lead first names only.
    </div>
  </div>
</div>`;

  return { subject: agendaSubject(agenda), html };
}
