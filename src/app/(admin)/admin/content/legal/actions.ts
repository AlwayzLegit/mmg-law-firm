"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { LEGAL_PAGE_SLUGS } from "@/lib/data/legal-pages";

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(400).optional().nullable(),
  body_md: z.string().min(1, "Body is required").max(40000),
  meta_description: z.string().trim().max(220).optional().nullable(),
  effective_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

const ReviewInput = z.object({
  id: z.string().uuid(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v.trim();
}

export async function updateLegalPage(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    body_md: formData.get("body_md"),
    meta_description: formData.get("meta_description"),
    effective_date: formData.get("effective_date"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();

  const { data: row } = await supabase
    .from("legal_pages")
    .select("slug")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await supabase
    .from("legal_pages")
    .update({
      title: parsed.data.title,
      subtitle: emptyToNull(parsed.data.subtitle),
      body_md: parsed.data.body_md,
      meta_description: emptyToNull(parsed.data.meta_description),
      effective_date: parsed.data.effective_date ?? null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "legal_pages",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/legal/${parsed.data.id}`);
  revalidatePath("/admin/content/legal");
  if (
    row?.slug &&
    (LEGAL_PAGE_SLUGS as readonly string[]).includes(row.slug)
  ) {
    revalidatePath(`/legal/${row.slug}`);
  }

  return { ok: true };
}

export async function togglePublishLegalPage(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = PublishInput.safeParse({
    id: formData.get("id"),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("legal_pages")
    .select("slug, body_md, last_reviewed_at")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (parsed.data.is_published) {
    if (!row?.body_md?.trim()) {
      return {
        ok: false,
        error:
          "Body is empty — publishing would just render the in-code template as if it were attorney-reviewed.",
      };
    }
    if (!row?.last_reviewed_at) {
      return {
        ok: false,
        error:
          "Mark the page as reviewed first (per spec §10.4: legal pages must be reviewed within 12 months).",
      };
    }
  }

  const { error } = await supabase
    .from("legal_pages")
    .update({ is_published: parsed.data.is_published })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "legal_pages",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/legal/${parsed.data.id}`);
  revalidatePath("/admin/content/legal");
  if (
    row?.slug &&
    (LEGAL_PAGE_SLUGS as readonly string[]).includes(row.slug)
  ) {
    revalidatePath(`/legal/${row.slug}`);
  }

  return { ok: true };
}

/** Stamp `last_reviewed_at = now()`. Used by the "Mark reviewed" button so
 *  the attorney can re-affirm a published page without changing copy. */
export async function markLegalPageReviewed(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = ReviewInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("legal_pages")
    .select("slug")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await supabase
    .from("legal_pages")
    .update({ last_reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "legal_pages",
    entity_id: parsed.data.id,
    action: "review",
  });

  revalidatePath(`/admin/content/legal/${parsed.data.id}`);
  revalidatePath("/admin/content/legal");
  if (
    row?.slug &&
    (LEGAL_PAGE_SLUGS as readonly string[]).includes(row.slug)
  ) {
    revalidatePath(`/legal/${row.slug}`);
  }

  return { ok: true };
}
