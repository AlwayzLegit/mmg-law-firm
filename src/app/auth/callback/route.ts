import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getServerSupabase } from "@/lib/supabase/server";
import { trustCurrentDevice } from "@/lib/auth/device-trust";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Link-based OTP types we accept on this callback. `token_hash` links are
// produced by admin.generateLink (invites) and the email templates
// (recovery, email change). The 6-digit device code is verified elsewhere
// (login-actions) and is intentionally not in this set.
const OTP_TYPES = new Set<EmailOtpType>([
  "invite",
  "magiclink",
  "recovery",
  "signup",
  "email_change",
  "email",
]);

/**
 * Auth callback for both email link mechanisms:
 *
 * 1. PKCE (`?code=...`) — produced by `signInWithOtp` for the normal
 *    magic-link login. Exchanged via `exchangeCodeForSession`. This needs the
 *    PKCE verifier cookie, so it only works in the browser that requested it.
 *
 * 2. token_hash (`?token_hash=...&type=...`) — produced by
 *    `admin.generateLink` (admin invites) and the recovery/email-change
 *    templates. Verified via `verifyOtp`, which needs NO prior client state —
 *    so it works for a brand-new invited user who has never visited before.
 *
 * Either path sets the auth cookie via the SSR cookie writer in proxy.ts.
 * On failure (expired/reused link, missing params) we bounce to /login with
 * an error code so the form can render a useful message.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/admin";

  const supabase = await getServerSupabase();

  let data;
  let error;
  if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
    ({ data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    }));
  } else if (code) {
    ({ data, error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    url.pathname = "/login";
    url.search = "?error=missing-code";
    return NextResponse.redirect(url);
  }

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
