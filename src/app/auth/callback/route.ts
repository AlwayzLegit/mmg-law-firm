import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { isLinkType } from "@/lib/auth/links";
import { authProvider } from "@/lib/auth/provider";
import { verifyBetterLink } from "@/lib/auth/session";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Link types this callback accepts. With Supabase all are `token_hash` links
// produced by `auth.admin.generateLink` (invite, magiclink for re-invites,
// recovery for password resets) and sent through Resend. They are verified with
// `verifyOtp`, which needs no prior browser state, so they work from any
// device or mail app. With Better Auth (OPS-365) the links carry `token`, a
// one-time token stored hashed in D1 (src/lib/auth/links.ts), and are redeemed
// through the session facade, with the same property.
const OTP_TYPES = new Set<EmailOtpType>(["invite", "magiclink", "recovery"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const better = authProvider() === "better-auth";
  const tokenHash = url.searchParams.get(better ? "token" : "token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/admin";

  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    url.pathname = "/login";
    url.search = "?error=missing-code";
    return NextResponse.redirect(url);
  }

  let verified: boolean;
  if (better) {
    verified = isLinkType(type) && (await verifyBetterLink(tokenHash, type));
  } else {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    verified = !error;
  }
  if (!verified) {
    url.pathname = "/login";
    url.search = "?error=auth-failed";
    return NextResponse.redirect(url);
  }

  // Keep the destination on this site. Our links set `next` to /onboarding
  // (invite) or /reset-password (recovery); parse it rather than assigning
  // pathname so a query string survives.
  const dest = new URL(
    next.startsWith("/") && !next.startsWith("//") ? next : "/admin",
    url.origin,
  );
  return NextResponse.redirect(dest);
}
