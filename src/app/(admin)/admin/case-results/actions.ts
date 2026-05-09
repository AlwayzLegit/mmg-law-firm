"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

const CreateInput = z.object({
  headline: z.string().trim().min(8).max(220),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  headline: z.string().trim().min(8).max(220),
  amount_cents: z
    .string()
    .trim()
    .regex(/^\d{0,15}$/, "Amount in cents must be a non-negative integer")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  amount_display: z.string().trim().max(40).optional().nullable(),
  practice_area_id: z.string().uuid().optional().nullable(),
  county_id: z.string().uuid().optional().nullable(),
  year: z.coerce
    .number()
    .int()
    .min(1980)
    .max(2100)
    .optional()
    .nullable(),
  anonymized_summary_md: z
    .string()
    .trim()
    .min(20, "Anonymized summary must be at least 20 characters")
    .max(20000),
});

const PublishInput = z.object({
  id: z.string().uuid(),
  is_published: z.boolean(),
});

const IdInput = z.object({ id: z.string().uuid() });

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull<T extends string | number | null | undefined>(v: T): T | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

export async function createCaseResult(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({ headline: formData.get("headline") });
  if (!parsed.success) {
    return { ok: false, error: "Headline must be 8–220 characters." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("case_results")
    .insert({
      headline: parsed.data.headline,
      anonymized_summary_md: "Describe the matter without identifying the client...",
      is_published: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create row." };
  }

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "case_results",
    entity_id: data.id,
    action: "create",
  });

  revalidatePath("/admin/case-results");
  return { ok: true, id: data.id };
}

export async function createCaseResultAndRedirect(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const result = await createCaseResult(formData);
  if (!result.ok) return result;
  redirect(`/admin/case-results/${result.id}`);
}

export async function updateCaseResult(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    headline: formData.get("headline"),
    amount_cents: formData.get("amount_cents"),
    amount_display: formData.get("amount_display"),
    practice_area_id: formData.get("practice_area_id"),
    county_id: formData.get("county_id"),
    year: formData.get("year") || null,
    anonymized_summary_md: formData.get("anonymized_summary_md"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("case_results")
    .update({
      headline: parsed.data.headline,
      amount_cents:
        parsed.data.amount_cents && parsed.data.amount_cents !== ""
          ? parsed.data.amount_cents
          : null,
      amount_display: emptyToNull(parsed.data.amount_display),
      practice_area_id: emptyToNull(parsed.data.practice_area_id),
      county_id: emptyToNull(parsed.data.county_id),
      year: parsed.data.year ?? null,
      anonymized_summary_md: parsed.data.anonymized_summary_md,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "case_results",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/case-results/${parsed.data.id}`);
  revalidatePath("/admin/case-results");
  revalidatePath("/case-results");
  revalidatePath("/");
  return { ok: true };
}

export async function togglePublishCaseResult(
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
    .from("case_results")
    .update({ is_published: parsed.data.is_published })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "case_results",
    entity_id: parsed.data.id,
    action: parsed.data.is_published ? "publish" : "unpublish",
  });

  revalidatePath(`/admin/case-results/${parsed.data.id}`);
  revalidatePath("/admin/case-results");
  revalidatePath("/case-results");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCaseResult(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = IdInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid id" };

  const supabase = await getServerSupabase();
  const { data: row } = await supabase
    .from("case_results")
    .select("is_published")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (row?.is_published) {
    return {
      ok: false,
      error:
        "Unpublish before deleting — keeps anything currently linking to it from breaking abruptly.",
    };
  }

  const { error } = await supabase
    .from("case_results")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "case_results",
    entity_id: parsed.data.id,
    action: "delete",
  });

  revalidatePath("/admin/case-results");
  revalidatePath("/case-results");
  return { ok: true };
}
