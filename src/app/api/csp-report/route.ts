import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Collector for Content-Security-Policy violation reports. Wired via the
 * `report-uri` / `report-to` directives in the CSP (see src/proxy.ts).
 *
 * Browsers POST one of two shapes:
 *   - legacy `report-uri`: { "csp-report": { "violated-directive", ... } }
 *   - modern `report-to`:  [ { type: "csp-violation", body: {...} }, ... ]
 *
 * We extract the useful fields and forward to Sentry as a low-noise message.
 * Reports caused by browser extensions (chrome-extension:// etc.) are
 * dropped — they're not our bug and would otherwise flood the inbox.
 */
type CspBody = {
  documentURL?: string;
  document_uri?: string;
  blockedURL?: string;
  "blocked-uri"?: string;
  effectiveDirective?: string;
  "violated-directive"?: string;
  disposition?: string;
};

function isExtensionNoise(blocked: string | undefined): boolean {
  if (!blocked) return false;
  return /^(chrome-extension|moz-extension|safari-extension|safari-web-extension):/i.test(
    blocked,
  );
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // Normalize both report shapes into a flat list of violation bodies.
  const bodies: CspBody[] = [];
  if (Array.isArray(payload)) {
    for (const r of payload) {
      const b = (r as { body?: CspBody })?.body;
      if (b) bodies.push(b);
    }
  } else if (payload && typeof payload === "object") {
    const legacy = (payload as { "csp-report"?: CspBody })["csp-report"];
    if (legacy) bodies.push(legacy);
  }

  for (const b of bodies) {
    const blocked = b.blockedURL ?? b["blocked-uri"];
    if (isExtensionNoise(blocked)) continue;
    const directive = b.effectiveDirective ?? b["violated-directive"] ?? "?";
    const docUrl = b.documentURL ?? b.document_uri ?? "?";
    Sentry.captureMessage(`CSP violation: ${directive}`, {
      level: "warning",
      tags: { kind: "csp-report", directive },
      extra: { blocked, documentURL: docUrl, disposition: b.disposition },
    });
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[csp-report] ${directive} blocked ${blocked} on ${docUrl}`);
    }
  }

  // 204: browsers don't read the body of a report response.
  return new NextResponse(null, { status: 204 });
}
