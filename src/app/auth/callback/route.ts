import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Link types this callback accepts. All are `token_hash` links produced by
// `auth.admin.generateLink` (invite, magiclink for re-invites, recovery for
// password resets) and sent through Resend. They are verified with
// `verifyOtp`, which needs no prior browser state, so they work from any
// device or mail app.
const OTP_TYPES = new Set<EmailOtpType>(["invite", "magiclink", "recovery"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/admin";

  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    url.pathname = "/login";
    url.search = "?error=missing-code";
    return NextResponse.redirect(url);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });
  if (error) {
    url.pathname = "/login";
    url.search = "?error=auth-failed";
    return NextResponse.redirect(url);
  }

  // Keep the destination on this site. `next` may carry its own query
  // (e.g. /onboarding?reset=1), so parse it rather than assigning pathname.
  const dest = new URL(
    next.startsWith("/") && !next.startsWith("//") ? next : "/admin",
    url.origin,
  );
  return NextResponse.redirect(dest);
}
