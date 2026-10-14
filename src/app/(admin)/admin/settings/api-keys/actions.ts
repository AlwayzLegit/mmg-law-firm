"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { generateToken } from "@/lib/api/api-keys";
import { normalizeScopes, SCOPES } from "@/lib/api/scopes";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export type CreateKeyResult =
  | { ok: true; token: string; prefix: string; name: string }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const CreateInput = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.enum(SCOPES)).min(1, "Pick at least one scope"),
  rate_limit_per_hour: z.coerce.number().int().min(1).max(100000).default(600),
  expires_in_days: z.coerce.number().int().min(0).max(3650).default(0),
  note: z.string().trim().max(500).optional(),
});

/**
 * Mint a scoped API key. The full token is returned ONCE and never stored —
 * only its sha256 hash and a display prefix.
 */
export async function createApiKey(formData: FormData): Promise<CreateKeyResult> {
  const { user, profile } = await requireAdmin();
  if (profile.role !== "owner") return { ok: false, error: "Only owners can create API keys." };
  const parsed = CreateInput.safeParse({
    name: formData.get("name"),
    scopes: normalizeScopes(formData.getAll("scopes").map(String)),
    rate_limit_per_hour: formData.get("rate_limit_per_hour") || 600,
    expires_in_days: formData.get("expires_in_days") || 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const t = generateToken();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name: d.name,
      prefix: t.prefix,
      key_hash: t.hash,
      scopes: d.scopes,
      rate_limit_per_hour: d.rate_limit_per_hour,
      note: d.note ?? null,
      created_by: user.id,
      expires_at: d.expires_in_days > 0 ? new Date(Date.now() + d.expires_in_days * 86400e3).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "api_keys", entity_id: (data as { id: string }).id, action: "create", diff: { name: d.name, scopes: d.scopes } });
  revalidatePath("/admin/settings/api-keys");
  return { ok: true, token: t.token, prefix: t.prefix, name: d.name };
}

export async function revokeApiKey(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireAdmin();
  if (profile.role !== "owner") return { ok: false, error: "Only owners can revoke API keys." };
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid id" };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);
  if (error) return { ok: false, error: error.message };
  logAudit({ actor_id: user.id, entity: "api_keys", entity_id: id, action: "revoke" });
  revalidatePath("/admin/settings/api-keys");
  return { ok: true };
}
