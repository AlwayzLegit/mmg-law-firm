"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

const UpdateInput = z.object({
  id: z.string().uuid(),
  intro_md: z.string().max(20000).optional().nullable(),
  local_stats_md: z.string().max(20000).optional().nullable(),
  meta_description: z.string().max(220).optional().nullable(),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v;
}

export async function updateCity(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    intro_md: formData.get("intro_md"),
    local_stats_md: formData.get("local_stats_md"),
    meta_description: formData.get("meta_description"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("cities")
    .update({
      intro_md: emptyToNull(parsed.data.intro_md),
      local_stats_md: emptyToNull(parsed.data.local_stats_md),
      meta_description: emptyToNull(parsed.data.meta_description),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "cities",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/cities/${parsed.data.id}`);
  revalidatePath("/admin/content/cities");
  revalidatePath("/admin/content/pages");

  return { ok: true };
}

export async function togglePublishCity(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = PublishInput.safeParse({
    id: formData.get("id"),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("cities")
    .update({ is_published: parsed.data.is_published })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "cities",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/cities/${parsed.data.id}`);
  revalidatePath("/admin/content/cities");
  revalidatePath("/admin/content/pages");

  return { ok: true };
}
