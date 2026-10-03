import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { env } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

import CreateKeyForm from "./create-key-form";
import RevokeButton from "./revoke-button";

export const dynamic = "force-dynamic";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  note: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export default async function ApiKeysPage() {
  const { profile } = await requireAdmin();
  if (profile.role !== "owner") redirect("/admin/settings");
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, scopes, rate_limit_per_hour, note, created_at, last_used_at, expires_at, revoked_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const keys = (data ?? []) as KeyRow[];
  const legacyOn = Boolean(env.ADMIN_API_KEY);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div>
      <Link href="/admin/settings" className="text-muted-foreground hover:text-primary text-sm">
        ← Settings
      </Link>
      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">API keys</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Scoped bearer tokens for the admin API (<code className="bg-secondary rounded px-1 py-0.5 text-xs">/api/admin/*</code>) — the content agent, n8n, scripts.
          Each key has its own scopes, rate limit and audit trail. See <code className="bg-secondary rounded px-1 py-0.5 text-xs">docs/admin-api.md</code>.
        </p>
      </div>

      {legacyOn ? (
        <p className="bg-warning/10 text-warning mt-4 rounded-md p-3 text-xs">
          The legacy shared <code>ADMIN_API_KEY</code> env var is still set and grants every scope. Move clients to scoped keys below, then clear it in Vercel.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keys ({keys.filter((k) => !k.revoked_at).length} active)</CardTitle>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <p className="text-muted-foreground text-sm">No keys yet. Create one on the right — the “Blog agent preset” is the right starting point for the daily content agent.</p>
            ) : (
              <ul className="divide-border divide-y text-sm">
                {keys.map((k) => {
                  const expired = k.expires_at && new Date(k.expires_at).getTime() <= now;
                  const dead = Boolean(k.revoked_at) || expired;
                  return (
                    <li key={k.id} className={`flex items-start justify-between gap-3 py-3 ${dead ? "opacity-60" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {k.name} <code className="bg-secondary ml-1 rounded px-1 py-0.5 text-xs">mmg_{k.prefix}_…</code>
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {k.scopes.join(" ")} · {k.rate_limit_per_hour}/h · created {new Date(k.created_at).toLocaleDateString("en-US")}
                          {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString("en-US")}` : " · never used"}
                          {k.expires_at ? ` · ${expired ? "expired" : "expires"} ${new Date(k.expires_at).toLocaleDateString("en-US")}` : ""}
                          {k.revoked_at ? ` · revoked ${new Date(k.revoked_at).toLocaleDateString("en-US")}` : ""}
                        </p>
                        {k.note ? <p className="text-muted-foreground mt-0.5 text-xs">{k.note}</p> : null}
                      </div>
                      {!k.revoked_at ? <RevokeButton id={k.id} name={k.name} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a key</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateKeyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
