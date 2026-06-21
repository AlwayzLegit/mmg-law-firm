import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` and pinned it to the
 * Node runtime. This file refreshes the Supabase session cookie on every
 * request and gates `/admin/*` routes to authenticated users with an
 * `admin_profiles` row.
 *
 * The runtime is Node only — `edge` is not supported in `proxy`.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

/**
 * Build the Content-Security-Policy for an HTML response, bound to a
 * per-request nonce.
 *
 * script-src uses the Google-recommended "strict CSP" shape: a nonce plus
 * 'strict-dynamic' (so any script a trusted/nonced script loads is in turn
 * trusted — this covers Turnstile, GTM→GA, and PostHog's dynamically
 * injected scripts). `https:` and 'unsafe-inline' are fallbacks that modern
 * browsers ignore when a nonce + strict-dynamic are present, but keep older
 * browsers working. Next.js reads the nonce from the request CSP header and
 * stamps it onto its own framework + next/script tags automatically.
 *
 * JSON-LD (<script type="application/ld+json">) is a data block, not executed,
 * so it is unaffected by script-src and needs no nonce.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    // Tailwind/Next emit inline <style> and style="" attributes; nonce-ing
    // every one isn't practical and style injection is far lower risk.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // XHR/fetch/websocket targets — strict-dynamic does not cover these.
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com`,
    // Turnstile widget + Google Maps embed render in iframes.
    `frame-src 'self' https://challenges.cloudflare.com https://www.google.com`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

type RedirectRule = { destination: string; permanent: boolean };

// Per-instance cache of admin-managed redirects so we hit the DB at most
// once per TTL window rather than on every request.
let redirectCache: { map: Map<string, RedirectRule>; expires: number } | null =
  null;
const REDIRECT_TTL_MS = 60_000;

async function getRedirects(): Promise<Map<string, RedirectRule>> {
  if (redirectCache && redirectCache.expires > Date.now()) {
    return redirectCache.map;
  }
  const map = new Map<string, RedirectRule>();
  try {
    const res = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/redirects?select=source_path,destination,permanent`,
      {
        headers: {
          apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        cache: "no-store",
      },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        source_path: string;
        destination: string;
        permanent: boolean;
      }>;
      for (const r of rows) {
        map.set(r.source_path, {
          destination: r.destination,
          permanent: r.permanent,
        });
      }
    }
  } catch {
    // Redirects are best-effort — never block a request on this lookup.
  }
  redirectCache = { map, expires: Date.now() + REDIRECT_TTL_MS };
  return map;
}

export async function proxy(request: NextRequest) {
  // Per-request CSP nonce. Set it on the *request* headers so Next.js stamps
  // it onto its own scripts; mirror the CSP onto every HTML response below.
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);
  const cspHeader = env.CSP_REPORT_ONLY
    ? "content-security-policy-report-only"
    : "content-security-policy";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  /** Attach the CSP (+ nonce echo) to a response before returning it. */
  function withCsp(res: NextResponse): NextResponse {
    res.headers.set(cspHeader, csp);
    res.headers.set("x-nonce", nonce);
    return res;
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const { pathname } = request.nextUrl;

  // Admin-managed redirects run first (cheapest path, cached). Skip the
  // admin app and login so an errant rule can't lock anyone out.
  if (
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login")
  ) {
    const rule = (await getRedirects()).get(pathname);
    if (rule) {
      const dest = /^https?:\/\//.test(rule.destination)
        ? rule.destination
        : new URL(rule.destination, request.url).toString();
      return NextResponse.redirect(dest, rule.permanent ? 308 : 307);
    }
  }

  // If Supabase isn't configured (typical in local dev without secrets),
  // fall through without attempting the session refresh.
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return withCsp(response);
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(values) {
          for (const { name, value } of values) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of values) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin gate: require an authenticated user. The deeper `requireAdmin()`
  // helper additionally checks `admin_profiles` server-side.
  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect already-signed-in admins away from /login. We verify
  // admin_profiles here so a non-admin Supabase user doesn't get sent into
  // an /admin → /login bounce loop. We skip this when `?verify=1` is present:
  // that means requireAdmin() bounced an unverified device back here for the
  // device second factor, and sending them to /admin would loop.
  if (
    request.nextUrl.pathname === "/login" &&
    user &&
    !request.nextUrl.searchParams.has("verify")
  ) {
    const { data: adminRow } = await supabase
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }
  }

  return withCsp(response);
}
