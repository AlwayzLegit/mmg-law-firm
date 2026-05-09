"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

const UpdateInput = z.object({
  id: z.string().uuid(),
  intro_md: z.string().max(8000).optional().nullable(),
  local_angle_md: z.string().max(20000).optional().nullable(),
  meta_description: z.string().max(220).optional().nullable(),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

const IdInput = z.object({ id: z.string().uuid() });

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v;
}

/** Update editorial fields on a location_pages row. Updating local_angle_md
 *  also bumps last_reviewed_at — that's the whole point of editing the page. */
export async function updateLocationPage(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    intro_md: formData.get("intro_md"),
    local_angle_md: formData.get("local_angle_md"),
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
    .from("location_pages")
    .update({
      intro_md: emptyToNull(parsed.data.intro_md),
      local_angle_md: emptyToNull(parsed.data.local_angle_md),
      meta_description: emptyToNull(parsed.data.meta_description),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "location_pages",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/location-pages/${parsed.data.id}`);
  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");
  // Tag-based revalidation of any public route that cached this row.
  revalidateTag(`location-page:${parsed.data.id}`, "max");

  return { ok: true };
}

/** Toggle is_published. Per spec §17 #1, refuses to publish if local_angle_md
 *  is empty — the DB RLS policy already hides such rows publicly, but we
 *  surface the error instead of letting the admin "publish" something that
 *  won't render. */
export async function togglePublish(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = PublishInput.safeParse({
    id: formData.get("id"),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();

  if (parsed.data.is_published) {
    const { data: row, error: getErr } = await supabase
      .from("location_pages")
      .select("local_angle_md")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (getErr || !row) {
      return { ok: false, error: getErr?.message ?? "Page not found" };
    }
    if (!row.local_angle_md || row.local_angle_md.trim() === "") {
      return {
        ok: false,
        error:
          "This page has no local_angle_md. Per CRPC §7.1 we don't publish city x practice pages without locally-relevant content. Add the angle, save, then try again.",
      };
    }
  }

  const { error } = await supabase
    .from("location_pages")
    .update({
      is_published: parsed.data.is_published,
      ...(parsed.data.is_published
        ? { last_reviewed_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "location_pages",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/location-pages/${parsed.data.id}`);
  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");

  return { ok: true };
}

/** Touch last_reviewed_at to right now without changing any content. Used
 *  when an admin reviews a page and confirms it's still accurate, satisfying
 *  the spec §10.4 12-month review requirement. */
export async function touchReviewed(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = IdInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("location_pages")
    .update({ last_reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "location_pages",
    entity_id: parsed.data.id,
    action: "touch_reviewed",
  });

  revalidatePath(`/admin/content/location-pages/${parsed.data.id}`);
  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");

  return { ok: true };
}
