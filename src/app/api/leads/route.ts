import { NextResponse, type NextRequest } from "next/server";

import { runAfterResponse } from "@/lib/after-response";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { withDeadline } from "@/lib/deadline";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { consentTextFor } from "@/lib/i18n";
import { LOCALE_LEAD_TAG, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { detectSpam, escapeHtml, parseClientIp } from "@/lib/leads/intake";
import { forcedInsertFailure } from "@/lib/leads/staging-switch";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSms } from "@/lib/sms/twilio";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { LeadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OPS-347: one deadline for the three lookups and the insert together, so a
// database that does not answer fails in about 5 s, not at the form's 20 s.
// The NOT STORED email has its own, longer limit.
const STORE_DEADLINE_MS = 5000;
const NOT_STORED_EMAIL_DEADLINE_MS = 8000;

type LeadFields = {
  full_name: string;
  phone: string;
  email?: string | null;
  practice_area?: string | null;
  city_slug?: string | null;
  incident_date?: string | null;
  description?: string | null;
};

const ROW_LABEL = "padding:4px 12px 4px 0; color:#666;";

/** The detail rows of a lead email, shared by the stored and the NOT STORED mail. */
function leadRowsHtml(
  lead: LeadFields,
  locale: Locale | null | undefined,
  localeTag: string | null,
): string {
  return `
          <tr><td style="${ROW_LABEL}">Name</td><td>${escapeHtml(lead.full_name)}</td></tr>
          <tr><td style="${ROW_LABEL}">Phone</td><td><a href="tel:${escapeHtml(lead.phone)}">${escapeHtml(lead.phone)}</a></td></tr>
          ${lead.email ? `<tr><td style="${ROW_LABEL}">Email</td><td><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>` : ""}
          ${locale && localeTag ? `<tr><td style="${ROW_LABEL}">Language</td><td>${escapeHtml(LOCALE_NAMES[locale].label)}</td></tr>` : ""}
          ${lead.practice_area ? `<tr><td style="${ROW_LABEL}">Matter</td><td>${escapeHtml(lead.practice_area)}</td></tr>` : ""}
          ${lead.city_slug ? `<tr><td style="${ROW_LABEL}">City</td><td>${escapeHtml(lead.city_slug)}</td></tr>` : ""}
          ${lead.incident_date ? `<tr><td style="${ROW_LABEL}">Incident</td><td>${escapeHtml(lead.incident_date)}</td></tr>` : ""}
          ${lead.description ? `<tr><td style="${ROW_LABEL} vertical-align: top;">Notes</td><td>${escapeHtml(lead.description).replace(/\n/g, "<br>")}</td></tr>` : ""}
  `;
}

export async function POST(request: NextRequest) {
  const ip = parseClientIp(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const limit = await checkRateLimit(`leads:${ip}`, 5);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate-limited",
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation-failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const turnstile = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!turnstile.ok) {
    // Log the Cloudflare error code (not the token/IP) so a misconfigured
    // widget is diagnosable from the Vercel runtime logs. Common reasons:
    // "turnstile-secret-missing" (TURNSTILE_SECRET_KEY unset), "missing-token"
    // (widget failed client-side — usually a hostname not allow-listed for the
    // site key), "invalid-input-secret" (secret/site-key pair mismatch).
    console.warn(`[leads] turnstile verification failed: ${turnstile.reason}`);
    return NextResponse.json(
      { ok: false, error: "turnstile-failed", reason: turnstile.reason },
      { status: 400 },
    );
  }

  const isSpam = detectSpam({
    fullName: parsed.data.full_name,
    description: parsed.data.description,
    company: parsed.data.company,
  });

  const consentAt = new Date().toISOString();
  const locale = parsed.data.locale;
  const localeTag = locale ? LOCALE_LEAD_TAG[locale] : null;

  // Resolve foreign keys via slug → uuid lookup. Each is best-effort.
  let persisted = false;

  if (isSupabaseConfigured()) {
    // The lookups and the insert run as one unit under one deadline (OPS-347).
    // It never throws: a throw or a deadline both read as "not stored".
    const storeLead = async () => {
      try {
        if (forcedInsertFailure()) return null;
        const supabase = getServiceSupabase();
        let practiceAreaId: string | null = null;
        let countyId: string | null = null;
        let cityId: string | null = null;

        if (parsed.data.practice_area) {
          const { data } = await supabase
            .from("practice_areas")
            .select("id")
            .eq("slug", parsed.data.practice_area)
            .maybeSingle();
          practiceAreaId = data?.id ?? null;
        }
        if (parsed.data.county_slug) {
          const { data } = await supabase
            .from("counties")
            .select("id")
            .eq("slug", parsed.data.county_slug)
            .maybeSingle();
          countyId = data?.id ?? null;
        }
        if (parsed.data.city_slug && countyId) {
          const { data } = await supabase
            .from("cities")
            .select("id")
            .eq("slug", parsed.data.city_slug)
            .eq("county_id", countyId)
            .maybeSingle();
          cityId = data?.id ?? null;
        }

        const insertResult = await supabase
          .from("leads")
          .insert({
            full_name: parsed.data.full_name,
            email: parsed.data.email ?? null,
            phone: parsed.data.phone,
            preferred_contact: parsed.data.preferred_contact ?? "phone",
            practice_area_id: practiceAreaId,
            county_id: countyId,
            city_id: cityId,
            incident_date: parsed.data.incident_date ?? null,
            description: parsed.data.description ?? null,
            has_attorney: parsed.data.has_attorney ?? false,
            consent_contact: true,
            consent_text: consentTextFor(locale),
            tags: localeTag ? [localeTag] : [],
            consent_ip: ip,
            consent_ts: consentAt,
            source_url: parsed.data.source_url ?? null,
            landing_url: parsed.data.landing_url ?? null,
            utm_source: parsed.data.utm_source ?? null,
            utm_medium: parsed.data.utm_medium ?? null,
            utm_campaign: parsed.data.utm_campaign ?? null,
            utm_term: parsed.data.utm_term ?? null,
            utm_content: parsed.data.utm_content ?? null,
            gclid: parsed.data.gclid ?? null,
            referrer: parsed.data.referrer ?? null,
            user_agent: userAgent ?? null,
            status: isSpam ? "spam" : "new",
          })
          .select("id")
          .maybeSingle();

        if (insertResult.error) {
          console.warn("[leads] insert error:", insertResult.error.message);
          return null;
        }
        return { supabase, leadId: insertResult.data?.id ?? null };
      } catch {
        // No message: an error object can carry a row. The deadline and the
        // insert error above are the only signals the route needs.
        return null;
      }
    };

    const stored = await withDeadline(storeLead(), STORE_DEADLINE_MS);

    if (!stored) {
      // The store did not answer or refused the row. A spam lead, or a site
      // with no notify address, ends exactly as before: 500. A real lead goes
      // to the firm by email only, marked NOT STORED, and the visitor is told
      // "received" only when that email was accepted.
      if (isSpam || !env.LEAD_NOTIFY_EMAIL) {
        return NextResponse.json(
          { ok: false, error: "db-insert-failed" },
          { status: 500 },
        );
      }
      const rows = leadRowsHtml(parsed.data, locale, localeTag);
      const html = `
        <h2 style="font-family: ui-sans-serif, sans-serif; margin: 0 0 12px;">NOT STORED: enter this enquiry by hand</h2>
        <p style="font-family: ui-sans-serif, sans-serif; font-size: 14px;">The site's database did not answer, so this enquiry exists only in this email. Enter it in the admin when the site is back.</p>
        <table style="font-family: ui-sans-serif, sans-serif; font-size: 14px; border-collapse: collapse;">
          ${rows}
          <tr><td style="${ROW_LABEL}">Consent text</td><td>${escapeHtml(consentTextFor(locale))}</td></tr>
          <tr><td style="${ROW_LABEL}">Consent time</td><td>${escapeHtml(consentAt)}</td></tr>
          <tr><td style="${ROW_LABEL}">IP</td><td>${escapeHtml(ip)}</td></tr>
        </table>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-family: ui-sans-serif, sans-serif; font-size: 12px; color: #888;">
          Sent by ${FIRM.legalName} intake system. ${FIRM_FULL_ADDRESS}.
        </p>
      `;
      let emailed = false;
      try {
        const sent = await withDeadline(
          sendEmail({
            to: env.LEAD_NOTIFY_EMAIL,
            subject: `NOT STORED, enter by hand: New lead: ${parsed.data.full_name}`,
            html,
            replyTo: parsed.data.email ?? undefined,
          }),
          NOT_STORED_EMAIL_DEADLINE_MS,
        );
        emailed = Boolean(sent?.ok);
      } catch {
        emailed = false;
      }
      if (!emailed) {
        return NextResponse.json(
          { ok: false, error: "db-insert-failed" },
          { status: 500 },
        );
      }
      // One fixed line: no name, contact or text of the lead.
      console.warn("[leads] insert failed, sent by email only");
      const smsBody = `New lead (NOT STORED, see email): ${parsed.data.full_name} — ${parsed.data.phone}`;
      runAfterResponse("leads-notify-not-stored", async () => {
        const sms = await sendSms({ to: FIRM.phoneTel, body: smsBody });
        if (!sms.ok && sms.reason !== "twilio-unconfigured") {
          console.error(
            "[leads] sms notify failed for a lead that was not stored",
          );
        }
      });
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { supabase, leadId } = stored;
    persisted = Boolean(leadId);

    // Audit log entry. Best-effort, after the response; never fails the
    // request. runAfterResponse keeps it alive on Cloudflare Workers.
    if (leadId) {
      runAfterResponse("leads-audit", async () => {
        const { error } = await supabase.from("audit_log").insert({
          entity: "leads",
          entity_id: leadId,
          action: isSpam ? "create_spam" : "create",
          ip,
        });
        if (error) console.warn("[leads] audit error:", error.message);
      });
    }

    if (!isSpam && env.LEAD_NOTIFY_EMAIL) {
      const subject = `New lead: ${parsed.data.full_name}`;
      const adminUrl = leadId ? `${siteUrl()}/admin/leads/${leadId}` : null;
      const html = `
        <h2 style="font-family: ui-sans-serif, sans-serif; margin: 0 0 12px;">New consultation request</h2>
        <table style="font-family: ui-sans-serif, sans-serif; font-size: 14px; border-collapse: collapse;">
          ${leadRowsHtml(parsed.data, locale, localeTag)}
        </table>
        ${adminUrl ? `<p style="font-family: ui-sans-serif, sans-serif; font-size: 14px; margin-top: 16px;"><a href="${adminUrl}">Open in admin →</a></p>` : ""}
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-family: ui-sans-serif, sans-serif; font-size: 12px; color: #888;">
          Sent by ${FIRM.legalName} intake system. ${FIRM_FULL_ADDRESS}.
        </p>
      `;
      // Notifications run after the response so they never slow the visitor
      // down, and runAfterResponse keeps them alive until they finish (a
      // bare `void` was cancelled on Cloudflare Workers). Failures are logged
      // with the lead ID so the admin can recover by calling the firm.
      const notifyTo = env.LEAD_NOTIFY_EMAIL;
      const replyTo = parsed.data.email ?? undefined;
      const smsBody = `New lead: ${parsed.data.full_name} — ${parsed.data.phone}`;
      runAfterResponse("leads-notify", async () => {
        const [email, sms] = await Promise.allSettled([
          sendEmail({ to: notifyTo, subject, html, replyTo }),
          sendSms({ to: FIRM.phoneTel, body: smsBody }),
        ]);
        if (email.status === "rejected" || !email.value.ok) {
          const why =
            email.status === "rejected"
              ? String(email.reason)
              : (email.value.error ?? "unknown");
          console.error(
            `[leads] email notify failed for lead=${leadId ?? "?"}: ${why}`,
          );
        }
        if (
          sms.status === "rejected" ||
          (!sms.value.ok && sms.value.reason !== "twilio-unconfigured")
        ) {
          const why =
            sms.status === "rejected"
              ? String(sms.reason)
              : (sms.value.reason ?? "unknown");
          console.error(
            `[leads] sms notify failed for lead=${leadId ?? "?"}: ${why}`,
          );
        }
      });
    }
  } else {
    if (process.env.NODE_ENV !== "production") {
      // No PII in logs (firm hard rule) — record only that a lead was
      // discarded and whether it was flagged spam, never the name/contact.
      console.info("[lead-stub] no Supabase configured — discarding lead", {
        spam: isSpam,
      });
    }
  }

  // A non-personal acknowledgement, not a lead ID or spam classification.
  // The development stub must never be counted as a stored submission.
  return NextResponse.json({ ok: true, persisted });
}
