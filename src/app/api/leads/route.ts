import { NextResponse, type NextRequest } from "next/server";

import { FIRM, FIRM_FULL_ADDRESS, TCPA_CONSENT_TEXT } from "@/lib/constants";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendSms } from "@/lib/sms/twilio";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { LeadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  const limit = checkRateLimit(`leads:${ip}`, 5);
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
    return NextResponse.json(
      { ok: false, error: "turnstile-failed", reason: turnstile.reason },
      { status: 400 },
    );
  }

  const desc = parsed.data.description ?? "";
  const urlsInDesc = desc.match(/(https?:\/\/|www\.)/gi)?.length ?? 0;
  const isSpam =
    urlsInDesc >= 3 || /(https?:\/\/|www\.)/i.test(parsed.data.full_name);

  const consentAt = new Date().toISOString();

  // Resolve foreign keys via slug → uuid lookup. Each is best-effort.
  let practiceAreaId: string | null = null;
  let countyId: string | null = null;
  let cityId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = getServiceSupabase();

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
        consent_text: TCPA_CONSENT_TEXT,
        consent_ip: ip,
        consent_ts: consentAt,
        source_url: parsed.data.source_url ?? null,
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
      return NextResponse.json(
        { ok: false, error: "db-insert-failed" },
        { status: 500 },
      );
    }

    const leadId = insertResult.data?.id ?? null;

    // Audit log entry. Best-effort; don't fail the request on this.
    if (leadId) {
      void supabase
        .from("audit_log")
        .insert({
          entity: "leads",
          entity_id: leadId,
          action: isSpam ? "create_spam" : "create",
          ip,
        })
        .then(({ error }) => {
          if (error) console.warn("[leads] audit error:", error.message);
        });
    }

    if (!isSpam && env.LEAD_NOTIFY_EMAIL) {
      const subject = `New lead: ${parsed.data.full_name}`;
      const adminUrl = leadId ? `${siteUrl()}/admin/leads/${leadId}` : null;
      const html = `
        <h2 style="font-family: ui-sans-serif, sans-serif; margin: 0 0 12px;">New consultation request</h2>
        <table style="font-family: ui-sans-serif, sans-serif; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding:4px 12px 4px 0; color:#666;">Name</td><td>${escape(parsed.data.full_name)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; color:#666;">Phone</td><td><a href="tel:${escape(parsed.data.phone)}">${escape(parsed.data.phone)}</a></td></tr>
          ${parsed.data.email ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Email</td><td><a href="mailto:${escape(parsed.data.email)}">${escape(parsed.data.email)}</a></td></tr>` : ""}
          ${parsed.data.practice_area ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Matter</td><td>${escape(parsed.data.practice_area)}</td></tr>` : ""}
          ${parsed.data.city_slug ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">City</td><td>${escape(parsed.data.city_slug)}</td></tr>` : ""}
          ${parsed.data.incident_date ? `<tr><td style="padding:4px 12px 4px 0; color:#666;">Incident</td><td>${escape(parsed.data.incident_date)}</td></tr>` : ""}
          ${parsed.data.description ? `<tr><td style="padding:4px 12px 4px 0; color:#666; vertical-align: top;">Notes</td><td>${escape(parsed.data.description).replace(/\n/g, "<br>")}</td></tr>` : ""}
        </table>
        ${adminUrl ? `<p style="font-family: ui-sans-serif, sans-serif; font-size: 14px; margin-top: 16px;"><a href="${adminUrl}">Open in admin →</a></p>` : ""}
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-family: ui-sans-serif, sans-serif; font-size: 12px; color: #888;">
          Sent by ${FIRM.legalName} intake system. ${FIRM_FULL_ADDRESS}.
        </p>
      `;
      void sendEmail({
        to: env.LEAD_NOTIFY_EMAIL,
        subject,
        html,
        replyTo: parsed.data.email ?? undefined,
      });

      void sendSms({
        to: FIRM.phoneTel,
        body: `New lead: ${parsed.data.full_name} — ${parsed.data.phone}`,
      });
    }
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.info("[lead-stub] no Supabase configured — discarding:", {
        name: parsed.data.full_name,
        spam: isSpam,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
