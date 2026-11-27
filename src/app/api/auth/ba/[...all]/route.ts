import { authProvider } from "@/lib/auth/provider";

// Better Auth's own endpoints (sign-in, sign-out, get-session ...) under
// /api/auth/ba/*. Answers 404 unless AUTH_PROVIDER=better-auth, so with the
// default provider this route does nothing (OPS-365). The invite, reset and
// password endpoints of src/lib/auth/better.ts are server only and have no URL.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  if (authProvider() !== "better-auth") return new Response("Not found", { status: 404 });
  const { getBetterAuth } = await import("@/lib/auth/better");
  const { auth } = await getBetterAuth();
  return auth.handler(request);
}

export const GET = handle;
export const POST = handle;
