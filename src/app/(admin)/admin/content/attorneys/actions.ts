"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v.trim();
}

function intOrNull(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseList(raw: string | null | undefined, max = 24): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, max);
}

const CreateInput = z.object({
  full_name: z.string().trim().min(2).max(160),
  bar_number: z.string().trim().min(1).max(40),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(SLUG_RE, "Slug must be lowercase letters, numbers, and hyphens"),
  full_name: z.string().trim().min(2).max(160),
  display_name: z.string().trim().max(60).optional().nullable(),
  job_title: z.string().trim().max(120).optional().nullable(),
  bar_state: z.string().trim().min(2).max(60),
  bar_number: z.string().trim().min(1).max(40),
  bar_admission_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  headshot_url: z
    .string()
    .trim()
    .url("Headshot must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  headshot_alt: z.string().trim().max(220).optional().nullable(),
  short_bio: z.string().trim().max(400).optional().nullable(),
  bio_md: z.string().trim().max(20000).optional().nullable(),
  law_school: z.string().trim().max(160).optional().nullable(),
  law_school_year: z.string().optional().nullable(),
  undergrad_school: z.string().trim().max(160).optional().nullable(),
  undergrad_degree: z.string().trim().max(160).optional().nullable(),
  undergrad_year: z.string().optional().nullable(),
  federal_court_admissions: z.string().optional().nullable(),
  bar_associations: z.string().optional().nullable(),
  honors_md: z.string().trim().max(8000).optional().nullable(),
  languages: z.string().optional().nullable(),
  avvo_url: z
    .string()
    .trim()
    .url("Avvo must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  justia_url: z
    .string()
    .trim()
    .url("Justia must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  linkedin_url: z
    .string()
    .trim()
    .url("LinkedIn must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  super_lawyers_url: z
    .string()
    .trim()
    .url("Super Lawyers must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  display_order: z.string().optional().nullable(),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };
type CreateOk = { ok: true; id: string; slug: string };

export async function createAttorneyProfile(
  formData: FormData,
): Promise<CreateOk | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({
    full_name: formData.get("full_name"),
    bar_number: formData.get("bar_number"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Full name and bar number are required.",
    };
  }

  const supabase = await getServerSupabase();

  const base = slugify(parsed.data.full_name) || "attorney";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase
      .from("attorney_profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await supabase
    .from("attorney_profiles")
    .insert({
      slug,
      full_name: parsed.data.full_name,
      bar_number: parsed.data.bar_number,
      bar_state: "California",
      is_published: false,
    })
    .select("id, slug")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create profile." };
  }

  logAudit({
    actor_id: user.id,
    entity: "attorney_profiles",
    entity_id: data.id,
    action: "create",
    diff: { slug: data.slug },
  });

  revalidatePath("/admin/content/attorneys");

  return { ok: true, id: data.id, slug: data.slug };
}

export async function createAttorneyProfileAndRedirect(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const result = await createAttorneyProfile(formData);
  if (!result.ok) return result;
  redirect(`/admin/content/attorneys/${result.id}`);
}

export async function updateAttorneyProfile(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    full_name: formData.get("full_name"),
    display_name: formData.get("display_name"),
    job_title: formData.get("job_title"),
    bar_state: formData.get("bar_state"),
    bar_number: formData.get("bar_number"),
    bar_admission_date: formData.get("bar_admission_date"),
    headshot_url: formData.get("headshot_url"),
    headshot_alt: formData.get("headshot_alt"),
    short_bio: formData.get("short_bio"),
    bio_md: formData.get("bio_md"),
    law_school: formData.get("law_school"),
    law_school_year: formData.get("law_school_year"),
    undergrad_school: formData.get("undergrad_school"),
    undergrad_degree: formData.get("undergrad_degree"),
    undergrad_year: formData.get("undergrad_year"),
    federal_court_admissions: formData.get("federal_court_admissions"),
    bar_associations: formData.get("bar_associations"),
    honors_md: formData.get("honors_md"),
    languages: formData.get("languages"),
    avvo_url: formData.get("avvo_url"),
    justia_url: formData.get("justia_url"),
    linkedin_url: formData.get("linkedin_url"),
    super_lawyers_url: formData.get("super_lawyers_url"),
    display_order: formData.get("display_order"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();

  const { data: current } = await supabase
    .from("attorney_profiles")
    .select("slug")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (current && current.slug !== parsed.data.slug) {
    const { data: clash } = await supabase
      .from("attorney_profiles")
      .select("id")
      .eq("slug", parsed.data.slug)
      .maybeSingle();
    if (clash) {
      return {
        ok: false,
        error: "That slug is already in use by another attorney profile.",
      };
    }
  }

  const lawYear = intOrNull(parsed.data.law_school_year ?? null);
  const undergradYear = intOrNull(parsed.data.undergrad_year ?? null);
  const order = intOrNull(parsed.data.display_order ?? null) ?? 100;

  const { error } = await supabase
    .from("attorney_profiles")
    .update({
      slug: parsed.data.slug,
      full_name: parsed.data.full_name,
      display_name: emptyToNull(parsed.data.display_name),
      job_title: emptyToNull(parsed.data.job_title),
      bar_state: parsed.data.bar_state,
      bar_number: parsed.data.bar_number,
      bar_admission_date: parsed.data.bar_admission_date ?? null,
      headshot_url: parsed.data.headshot_url ?? null,
      headshot_alt: emptyToNull(parsed.data.headshot_alt),
      short_bio: emptyToNull(parsed.data.short_bio),
      bio_md: emptyToNull(parsed.data.bio_md),
      law_school: emptyToNull(parsed.data.law_school),
      law_school_year: lawYear,
      undergrad_school: emptyToNull(parsed.data.undergrad_school),
      undergrad_degree: emptyToNull(parsed.data.undergrad_degree),
      undergrad_year: undergradYear,
      federal_court_admissions: parseList(parsed.data.federal_court_admissions),
      bar_associations: parseList(parsed.data.bar_associations),
      honors_md: emptyToNull(parsed.data.honors_md),
      languages: parseList(parsed.data.languages),
      avvo_url: parsed.data.avvo_url ?? null,
      justia_url: parsed.data.justia_url ?? null,
      linkedin_url: parsed.data.linkedin_url ?? null,
      super_lawyers_url: parsed.data.super_lawyers_url ?? null,
      display_order: order,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "attorney_profiles",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/attorneys/${parsed.data.id}`);
  revalidatePath("/admin/content/attorneys");
  revalidatePath("/");
  revalidatePath(`/attorneys/${parsed.data.slug}`);

  return { ok: true };
}

export async function togglePublishAttorneyProfile(
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
    .from("attorney_profiles")
    .select("slug, full_name, bar_number")
    .eq("id", parsed.data.id)
    .maybeSingle();

  // Refuse to publish a profile that's still missing the basics — bar number
  // is the one CRPC 7.1-required identifier we know up front. Other fields
  // (bio, education) are encouraged but not gating; the public page handles
  // missing fields gracefully.
  if (parsed.data.is_published) {
    if (!row?.bar_number?.trim()) {
      return {
        ok: false,
        error: "Add a bar number before publishing.",
      };
    }
  }

  const { error } = await supabase
    .from("attorney_profiles")
    .update({ is_published: parsed.data.is_published })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "attorney_profiles",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/attorneys/${parsed.data.id}`);
  revalidatePath("/admin/content/attorneys");
  revalidatePath("/");
  if (row?.slug) revalidatePath(`/attorneys/${row.slug}`);

  return { ok: true };
}

export async function deleteAttorneyProfile(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid id" };
  }

  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("attorney_profiles")
    .select("slug, is_published")
    .eq("id", id)
    .maybeSingle();
  if (row?.is_published) {
    return {
      ok: false,
      error:
        "Unpublish before deleting — keeps the public bio URL from breaking abruptly.",
    };
  }

  const { error } = await supabase
    .from("attorney_profiles")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "attorney_profiles",
    entity_id: id,
    action: "delete",
    diff: { slug: row?.slug },
  });

  revalidatePath("/admin/content/attorneys");
  return { ok: true };
}

// =========================================================================
// Headshot upload — uses the service-role client for the storage put to
// avoid round-tripping the file through the user's session, then writes the
// public URL onto the profile row.
// =========================================================================

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function uploadAttorneyHeadshot(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid attorney id" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image first." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: "Headshot must be JPEG, PNG, or WebP.",
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Headshot must be under 4 MB." };
  }

  const userClient = await getServerSupabase();
  const { data: row } = await userClient
    .from("attorney_profiles")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Profile not found." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${row.slug}/${Date.now()}.${ext}`;

  const service = getServiceSupabase();
  const { error: uploadErr } = await service.storage
    .from("attorney-headshots")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  const { data: pub } = service.storage
    .from("attorney-headshots")
    .getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: updateErr } = await userClient
    .from("attorney_profiles")
    .update({ headshot_url: url })
    .eq("id", id);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  void userClient.from("audit_log").insert({
    actor_id: user.id,
    entity: "attorney_profiles",
    entity_id: id,
    action: "headshot_upload",
    diff: { path },
  });

  revalidatePath(`/admin/content/attorneys/${id}`);
  revalidatePath(`/attorneys/${row.slug}`);
  revalidatePath("/");

  return { ok: true, url };
}
