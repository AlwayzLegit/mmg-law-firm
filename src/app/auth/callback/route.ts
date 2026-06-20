import { NextResponse, type NextRequest } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";
import { trustCurrentDevice } from "@/lib/auth/device-trust";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link callback. Supabase signInWithOtp with PKCE returns the user
 * here with `?code=...&next=/admin`. We exchange the code for a session
 * (which sets the auth cookie via the SSR cookie writer in proxy.ts) and
 * redirect to the requested destination.
 *
 * If the exchange fails (link expired, code reused, etc.), bounce to
 * /login with an error code so the form can render a useful message.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/admin";

  if (!code) {
    url.pathname = "/login";
    url.search = "?error=missing-code";
    return NextResponse.redirect(url);
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    url.pathname = "/login";
    url.search = "?error=auth-failed";
    return NextResponse.redirect(url);
  }

  // Clicking an emailed link proves control of the inbox, so this device is
  // verified — remember it so the second factor isn't demanded next time.
  if (data.user) {
    await trustCurrentDevice(data.user.id);
  }

  // Clear the search params and send the user to their destination.
  url.search = "";
  url.pathname = next.startsWith("/") ? next : "/admin";
  return NextResponse.redirect(url);
}
