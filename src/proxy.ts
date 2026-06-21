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
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)",
  ],
};

/**
 * Build the Content-Security-Policy for HTML responses.
 *
 * IMPORTANT: this is an allowlist policy with `'unsafe-inline'` for scripts —
 * NOT a nonce/strict-dynamic policy. A nonce-based strict CSP is fundamentally
 * incompatible with this site's statically-generated / ISR pages: Next can
 * only stamp a per-request nonce onto *dynamically* rendered HTML, so the
 * prerendered marketing pages (homepage, practice areas, locations …) would
 * serve inline hydration scripts with no nonce and the browser would block
 * them — rendering the page non-interactive. Allowing inline scripts keeps
 * those static pages working while still constraining *where* scripts, frames,
 * and connections may come from. (Verified in prod: nonces only landed on the
 * dynamic /login route, never on the static homepage.)
 *
 * Trade-off: `'unsafe-inline'` weakens XSS protection vs. a nonce policy, but
 * everything else (object-src, base-uri, frame-ancestors, connect/frame
 * allowlists) still applies, and it's a real improvement over no script CSP.
 */
function buildCsp(): string {
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    // 'self' + inline (required for Next's static-page bootstrap) + the
    // third-party script origins we actually load.
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://*.google-analytics.com https://us.i.posthog.com https://us-assets.i.posthog.com https://va.vercel-scripts.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://us.i.posthog.com https://us-assets.i.posthog.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com`,
    // Turnstile widget + Google Maps embed render in iframes.
    `frame-src 'self' https://challenges.cloudflare.com https://www.google.com`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
    // Violation reporting → /api/csp-report (Sentry). report-to is the modern
    // channel (paired with the Reporting-Endpoints header set in withCsp);
    // report-uri is the legacy fallback for browsers that lack it.
    `report-uri /api/csp-report`,
    `report-to csp-endpoint`,
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
  const csp = buildCsp();
  const cspHeader = env.CSP_REPORT_ONLY
    ? "content-security-policy-report-only"
    : "content-security-policy";

  /** Attach the CSP (+ reporting endpoint) to a response before returning it. */
  function withCsp(res: NextResponse): NextResponse {
    res.headers.set(cspHeader, csp);
    // Modern reporting channel for the `report-to csp-endpoint` directive.
    res.headers.set("reporting-endpoints", 'csp-endpoint="/api/csp-report"');
    return res;
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
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
            request: { headers: request.headers },
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
