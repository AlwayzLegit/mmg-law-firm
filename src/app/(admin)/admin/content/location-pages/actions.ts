"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit, logAuditMany } from "@/lib/audit";

const CreateInput = z.object({
  city_id: z.string().uuid(),
  practice_area_id: z.string().uuid(),
});

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

/** Create a new draft location_pages row for a (city, practice_area) pair.
 *  Returns the new id (and redirects in the wrapper) so the caller can
 *  send the user straight into the editor for the fresh row. */
export async function createLocationPage(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({
    city_id: formData.get("city_id"),
    practice_area_id: formData.get("practice_area_id"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Pick both a city and a practice area." };
  }

  const supabase = await getServerSupabase();

  // The unique (city_id, practice_area_id) constraint will reject duplicates.
  // We surface a useful message instead of letting Supabase's raw error leak.
  const { data: existing } = await supabase
    .from("location_pages")
    .select("id")
    .eq("city_id", parsed.data.city_id)
    .eq("practice_area_id", parsed.data.practice_area_id)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error:
        "A page already exists for this city + practice combination. Open it from the list.",
    };
  }

  const { data, error } = await supabase
    .from("location_pages")
    .insert({
      city_id: parsed.data.city_id,
      practice_area_id: parsed.data.practice_area_id,
      is_published: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create row." };
  }

  logAudit({
    actor_id: user.id,
    entity: "location_pages",
    entity_id: data.id,
    action: "create",
    diff: {
      city_id: parsed.data.city_id,
      practice_area_id: parsed.data.practice_area_id,
    },
  });

  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");

  return { ok: true, id: data.id };
}

/** Convenience wrapper that calls createLocationPage and redirects to the
 *  detail editor on success. Lets us use it directly as a form action. */
export async function createLocationPageAndRedirect(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const result = await createLocationPage(formData);
  if (!result.ok) return result;
  redirect(`/admin/content/location-pages/${result.id}`);
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
  const { data: row, error } = await supabase
    .from("location_pages")
    .update({
      intro_md: emptyToNull(parsed.data.intro_md),
      local_angle_md: emptyToNull(parsed.data.local_angle_md),
      meta_description: emptyToNull(parsed.data.meta_description),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .select(
      `cities!inner(slug, counties!inner(slug)), practice_areas!inner(slug)`,
    )
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "location_pages",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/location-pages/${parsed.data.id}`);
  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");
  // Public page revalidation. `getLocationPage` is uncached, so we revalidate
  // the rendered path directly rather than relying on a cache tag.
  if (row) {
    const r = row as unknown as {
      cities: { slug: string; counties: { slug: string } };
      practice_areas: { slug: string };
    };
    revalidatePath(
      `/locations/${r.cities.counties.slug}/${r.cities.slug}/${r.practice_areas.slug}`,
    );
  }

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

  logAudit({
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

const BulkPublishInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  is_published: z.boolean(),
});

export type BulkResult =
  | { ok: true; updated: number; skipped: number }
  | { ok: false; error: string };

/**
 * Bulk publish / unpublish location pages. Publishing skips any row whose
 * local_angle_md is empty (spec §17 #1) and reports the skip count rather
 * than failing the whole batch. Stamps last_reviewed_at on publish and
 * revalidates each affected public path.
 */
export async function bulkSetLocationPagePublished(
  formData: FormData,
): Promise<BulkResult> {
  const { user } = await requireAdmin();

  const parsed = BulkPublishInput.safeParse({
    ids: formData.getAll("ids").map(String).filter(Boolean),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { data, error: fetchErr } = await supabase
    .from("location_pages")
    .select(
      `id, local_angle_md, cities!inner(slug, counties!inner(slug)), practice_areas!inner(slug)`,
    )
    .in("id", parsed.data.ids);
  if (fetchErr) return { ok: false, error: fetchErr.message };

  const all = (data ?? []) as unknown as Array<{
    id: string;
    local_angle_md: string | null;
    cities: { slug: string; counties: { slug: string } };
    practice_areas: { slug: string };
  }>;

  const targets = parsed.data.is_published
    ? all.filter((r) => r.local_angle_md && r.local_angle_md.trim() !== "")
    : all;
  const skipped = all.length - targets.length;

  if (targets.length === 0) {
    return {
      ok: false,
      error: parsed.data.is_published
        ? "None of the selected pages have a local angle yet — add content before publishing."
        : "Nothing to update.",
    };
  }

  const { error } = await supabase
    .from("location_pages")
    .update({
      is_published: parsed.data.is_published,
      ...(parsed.data.is_published
        ? { last_reviewed_at: new Date().toISOString() }
        : {}),
    })
    .in(
      "id",
      targets.map((r) => r.id),
    );
  if (error) return { ok: false, error: error.message };

  logAuditMany(
    targets.map((r) => ({
      actor_id: user.id,
      entity: "location_pages",
      entity_id: r.id,
      action: parsed.data.is_published ? "bulk_publish" : "bulk_unpublish",
    })),
  );

  revalidatePath("/admin/content/location-pages");
  revalidatePath("/admin/content/pages");
  for (const r of targets) {
    revalidatePath(
      `/locations/${r.cities.counties.slug}/${r.cities.slug}/${r.practice_areas.slug}`,
    );
  }

  return { ok: true, updated: targets.length, skipped };
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

  logAudit({
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
