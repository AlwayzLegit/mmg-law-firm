import { redirect } from "next/navigation";

import { AdminPageHeader, EmptyNote, Panel, TonePill, adminCode } from "@/components/admin/ui";
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
      <AdminPageHeader
        eyebrow="Settings"
        title="API keys"
        description={
          <>
            Scoped bearer tokens for the admin API (<code className={adminCode}>/api/admin/*</code>) — the content agent, n8n, scripts.
            Each key has its own scopes, rate limit and audit trail. See <code className={adminCode}>docs/admin-api.md</code>.
          </>
        }
      />

      {legacyOn ? (
        <p className="bg-gold/18 text-gold-deep mt-5 rounded-[10px] p-3 text-xs">
          The legacy shared <code>ADMIN_API_KEY</code> env var is still set and grants every scope. Move clients to scoped keys below,
          then clear it in Vercel.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={`Keys (${keys.filter((k) => !k.revoked_at).length} active)`}>
            {keys.length === 0 ? (
              <EmptyNote>No keys yet. Create one on the right — the “Blog agent preset” is the right starting point for the daily content agent.</EmptyNote>
            ) : (
              <ul className="divide-line m-0 list-none divide-y p-0 text-[13px]">
                {keys.map((k) => {
                  const expired = k.expires_at && new Date(k.expires_at).getTime() <= now;
                  const dead = Boolean(k.revoked_at) || expired;
                  return (
                    <li key={k.id} className={`flex items-start justify-between gap-3 py-3 ${dead ? "opacity-60" : ""}`}>
                      <div className="min-w-0">
                        <p className="m-0 flex flex-wrap items-center gap-2 font-semibold">
                          {k.name} <code className={adminCode}>mmg_{k.prefix}_…</code>
                          {k.revoked_at ? <TonePill tone="bad">Revoked</TonePill> : expired ? <TonePill tone="muted">Expired</TonePill> : <TonePill tone="good">Active</TonePill>}
                        </p>
                        <p className="text-stone m-0 mt-1 text-xs">
                          {k.scopes.join(" ")} · {k.rate_limit_per_hour}/h · created {new Date(k.created_at).toLocaleDateString("en-US")}
                          {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString("en-US")}` : " · never used"}
                          {k.expires_at ? ` · ${expired ? "expired" : "expires"} ${new Date(k.expires_at).toLocaleDateString("en-US")}` : ""}
                          {k.revoked_at ? ` · revoked ${new Date(k.revoked_at).toLocaleDateString("en-US")}` : ""}
                        </p>
                        {k.note ? <p className="text-stone m-0 mt-0.5 text-xs">{k.note}</p> : null}
                      </div>
                      {!k.revoked_at ? <RevokeButton id={k.id} name={k.name} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
        </Panel>
        <Panel title="Create a key" className="self-start">
          <CreateKeyForm />
        </Panel>
      </div>
    </div>
  );
}
