import { NextResponse, type NextRequest } from "next/server";

import { TCPA_CONSENT_TEXT } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { LeadSchema } from "@/lib/validation/lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
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

  // Heuristic spam routing: 3+ URLs in description or URL in name → spam
  const desc = parsed.data.description ?? "";
  const urlsInDesc = desc.match(/(https?:\/\/|www\.)/gi)?.length ?? 0;
  const isSpam =
    urlsInDesc >= 3 || /(https?:\/\/|www\.)/i.test(parsed.data.full_name);

  // Snapshot of the consent text + timestamp at submission. This is required
  // to defeat a future TCPA challenge — we need to be able to prove what the
  // user saw and agreed to.
  const consentAt = new Date().toISOString();

  const leadPayload = {
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    preferred_contact: parsed.data.preferred_contact,
    practice_area_slug: parsed.data.practice_area,
    county_slug: parsed.data.county_slug,
    city_slug: parsed.data.city_slug,
    incident_date: parsed.data.incident_date,
    description: parsed.data.description,
    has_attorney: parsed.data.has_attorney,
    consent_contact: true,
    consent_text: TCPA_CONSENT_TEXT,
    consent_ip: ip,
    consent_ts: consentAt,
    source_url: parsed.data.source_url,
    utm_source: parsed.data.utm_source,
    utm_medium: parsed.data.utm_medium,
    utm_campaign: parsed.data.utm_campaign,
    utm_term: parsed.data.utm_term,
    utm_content: parsed.data.utm_content,
    gclid: parsed.data.gclid,
    referrer: parsed.data.referrer,
    user_agent: userAgent,
    status: isSpam ? ("spam" as const) : ("new" as const),
  };

  // TODO(group-d): insert into Supabase `leads` table via service-role client
  // TODO(group-e): send Resend notification to LEAD_NOTIFY_EMAIL
  // TODO(group-e): write to audit_log
  // TODO(group-e): SMS notify (stub) when Twilio creds exist
  if (process.env.NODE_ENV !== "production") {
    console.info("[lead-stub] received submission", {
      name: leadPayload.full_name,
      status: leadPayload.status,
    });
  }

  return NextResponse.json({ ok: true });
}
