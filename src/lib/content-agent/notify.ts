import "server-only";

import { FIRM } from "@/lib/constants";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { escapeHtml } from "@/lib/leads/intake";
import { siteUrl } from "@/lib/seo/canonical";

import type { AgentSettings } from "./settings";

/**
 * Owner notification when a content-agent run finishes. Which outcomes
 * notify is governed by `settings.notify_on`. Never throws.
 */
export async function notifyRunFinished(args: {
  settings: AgentSettings;
  run: {
    id: string;
    agent_name: string;
    status: string;
    summary_md: string | null;
    posts_created: string[];
    error: string | null;
  };
  questionsCreated: number;
  needsReviewCount: number;
}): Promise<void> {
  const { settings, run } = args;
  const reasons: string[] = [];
  if (settings.notify_on.includes("every_run")) reasons.push("every_run");
  if (run.status === "failed" && settings.notify_on.includes("failure")) reasons.push("failure");
  if (run.status === "needs_human" && settings.notify_on.includes("needs_human")) reasons.push("needs_human");
  if (args.questionsCreated > 0 && settings.notify_on.includes("questions")) reasons.push("questions");
  if (reasons.length === 0) return;

  const to = env.CONTENT_NOTIFY_EMAIL || env.LEAD_NOTIFY_EMAIL;
  if (!to) return;

  const base = siteUrl();
  const subject = `[Content agent] ${run.status} — ${run.posts_created.length} post(s), ${args.questionsCreated} question(s)`;
  const summary = run.summary_md ? escapeHtml(run.summary_md).replace(/\n/g, "<br>") : "<em>No summary provided.</em>";
  const html = `
    <h2 style="font-family: ui-sans-serif, sans-serif; margin: 0 0 12px;">Content agent run: ${escapeHtml(run.status)}</h2>
    <p style="font-family: ui-sans-serif, sans-serif; font-size: 14px;">Agent <strong>${escapeHtml(run.agent_name)}</strong> · ${run.posts_created.length} post(s) created · ${args.questionsCreated} question(s) for you · ${args.needsReviewCount} post(s) awaiting review.</p>
    ${run.error ? `<p style="font-family: ui-sans-serif, sans-serif; font-size: 14px; color: #b91c1c;"><strong>Error:</strong> ${escapeHtml(run.error)}</p>` : ""}
    <div style="font-family: ui-sans-serif, sans-serif; font-size: 14px; border-left: 3px solid #c9a35a; padding: 8px 12px; margin: 16px 0;">${summary}</div>
    <p style="font-family: ui-sans-serif, sans-serif; font-size: 14px;">
      <a href="${base}/admin/content/agent/runs/${run.id}">Open the run report →</a><br>
      <a href="${base}/admin/content/blog?status=needs_review">Review drafts →</a>
    </p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
    <p style="font-family: ui-sans-serif, sans-serif; font-size: 12px; color: #888;">Sent by the ${escapeHtml(FIRM.legalName)} content agent.</p>
  `;
  try {
    const r = await sendEmail({ to, subject, html });
    if (!r.ok) console.warn("[content-agent] notify failed:", r.error);
  } catch (err) {
    console.warn("[content-agent] notify exception:", err);
  }
}
