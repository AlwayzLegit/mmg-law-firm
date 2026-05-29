"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const SubtopicSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
});

const FaqSchema = z.object({
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(4000),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  intro_md: z.string().trim().max(800).optional().nullable(),
  body_md: z.string().trim().max(20000).optional().nullable(),
  meta_description: z.string().trim().max(220).optional().nullable(),
  display_order: z.string().optional().nullable(),
  /** JSON-encoded arrays from the editor's hidden fields. */
  subtopics_json: z.string().optional().nullable(),
  what_to_do_json: z.string().optional().nullable(),
  faq_json: z.string().optional().nullable(),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  return v.trim() === "" ? null : v.trim();
}

function intOrDefault(v: string | null | undefined, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseJsonArray<T>(
  raw: string | null | undefined,
  itemSchema: z.ZodType<T>,
  max = 50,
): { ok: true; value: T[] } | { ok: false; error: string } {
  if (!raw || raw.trim() === "") return { ok: true, value: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Editor sent malformed JSON." };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Expected an array of entries." };
  }
  if (parsed.length > max) {
    return { ok: false, error: `Too many entries (max ${max}).` };
  }
  const out: T[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const r = itemSchema.safeParse(parsed[i]);
    if (!r.success) {
      const msg = r.error.issues[0]?.message ?? "invalid";
      return { ok: false, error: `Entry ${i + 1}: ${msg}` };
    }
    out.push(r.data);
  }
  return { ok: true, value: out };
}

export async function updatePracticeArea(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    intro_md: formData.get("intro_md"),
    body_md: formData.get("body_md"),
    meta_description: formData.get("meta_description"),
    display_order: formData.get("display_order"),
    subtopics_json: formData.get("subtopics_json"),
    what_to_do_json: formData.get("what_to_do_json"),
    faq_json: formData.get("faq_json"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const subtopics = parseJsonArray(
    parsed.data.subtopics_json,
    SubtopicSchema,
    20,
  );
  if (!subtopics.ok) return { ok: false, error: `Subtopics — ${subtopics.error}` };

  const whatToDo = parseJsonArray(
    parsed.data.what_to_do_json,
    z.string().trim().min(1).max(400),
    20,
  );
  if (!whatToDo.ok) return { ok: false, error: `What to do — ${whatToDo.error}` };

  const faqs = parseJsonArray(parsed.data.faq_json, FaqSchema, 30);
  if (!faqs.ok) return { ok: false, error: `FAQs — ${faqs.error}` };

  const supabase = await getServerSupabase();

  const { data: row } = await supabase
    .from("practice_areas")
    .select("slug")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await supabase
    .from("practice_areas")
    .update({
      intro_md: emptyToNull(parsed.data.intro_md),
      body_md: emptyToNull(parsed.data.body_md),
      meta_description: emptyToNull(parsed.data.meta_description),
      display_order: intOrDefault(parsed.data.display_order, 100),
      subtopics_json: subtopics.value,
      what_to_do_json: whatToDo.value,
      faq_json: faqs.value,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "practice_areas",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/practice-areas/${parsed.data.id}`);
  revalidatePath("/admin/content/practice-areas");
  if (row?.slug) revalidatePath(`/practice-areas/${row.slug}`);
  revalidatePath("/practice-areas");

  return { ok: true };
}

export async function togglePublishPracticeArea(
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
    .from("practice_areas")
    .select("slug, body_md")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (parsed.data.is_published) {
    if (!row?.body_md?.trim()) {
      return {
        ok: false,
        error:
          "Add a body before publishing — otherwise the public page would render the static fallback as if it were attorney-reviewed.",
      };
    }
  }

  const { error } = await supabase
    .from("practice_areas")
    .update({ is_published: parsed.data.is_published })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "practice_areas",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/content/practice-areas/${parsed.data.id}`);
  revalidatePath("/admin/content/practice-areas");
  if (row?.slug) revalidatePath(`/practice-areas/${row.slug}`);

  return { ok: true };
}
