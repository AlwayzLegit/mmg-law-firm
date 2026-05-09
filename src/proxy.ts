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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // If Supabase isn't configured (typical in local dev without secrets),
  // fall through without attempting the session refresh.
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return response;
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

  // Redirect already-signed-in users away from /login.
  if (request.nextUrl.pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}
