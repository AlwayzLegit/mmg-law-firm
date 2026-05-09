"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

import { TESTIMONIAL_SOURCES as SOURCES } from "./constants";

const CreateInput = z.object({
  client_initials: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(
      /^[A-Z]\.?(?: ?[A-Z]\.?){0,3}$/,
      "Use initials only (e.g., 'J.S.' or 'J.M.S.') — no full names per CRPC §7.1.",
    ),
  quote: z.string().trim().min(10).max(1500),
});

const UpdateInput = z.object({
  id: z.string().uuid(),
  client_initials: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(
      /^[A-Z]\.?(?: ?[A-Z]\.?){0,3}$/,
      "Use initials only — no full names.",
    ),
  city: z.string().trim().max(80).optional().nullable(),
  practice_area_id: z.string().uuid().optional().nullable(),
  quote: z.string().trim().min(10).max(1500),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  source: z.enum(SOURCES).optional().nullable(),
  display_order: z.coerce.number().int().min(0).max(9999).default(100),
});

const ApproveInput = z.object({
  id: z.string().uuid(),
  is_approved: z.boolean(),
});

const IdInput = z.object({ id: z.string().uuid() });

export type ActionResult = { ok: true } | { ok: false; error: string };

function emptyToNull<T extends string | number | null | undefined>(v: T): T | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

export async function createTestimonial(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({
    client_initials: formData.get("client_initials"),
    quote: formData.get("quote"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      client_initials: parsed.data.client_initials,
      quote: parsed.data.quote,
      is_approved: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create row." };
  }

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "testimonials",
    entity_id: data.id,
    action: "create",
  });

  revalidatePath("/admin/content/testimonials");
  return { ok: true, id: data.id };
}

export async function createTestimonialAndRedirect(
  formData: FormData,
): Promise<{ ok: false; error: string } | undefined> {
  const result = await createTestimonial(formData);
  if (!result.ok) return result;
  redirect(`/admin/content/testimonials/${result.id}`);
}

export async function updateTestimonial(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    id: formData.get("id"),
    client_initials: formData.get("client_initials"),
    city: formData.get("city"),
    practice_area_id: formData.get("practice_area_id"),
    quote: formData.get("quote"),
    rating: formData.get("rating"),
    source: formData.get("source"),
    display_order: formData.get("display_order") ?? 100,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("testimonials")
    .update({
      client_initials: parsed.data.client_initials,
      city: emptyToNull(parsed.data.city),
      practice_area_id: emptyToNull(parsed.data.practice_area_id),
      quote: parsed.data.quote,
      rating: parsed.data.rating ?? null,
      source: parsed.data.source ?? null,
      display_order: parsed.data.display_order,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "testimonials",
    entity_id: parsed.data.id,
    action: "edit",
  });

  revalidatePath(`/admin/content/testimonials/${parsed.data.id}`);
  revalidatePath("/admin/content/testimonials");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleApprove(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = ApproveInput.safeParse({
    id: formData.get("id"),
    is_approved: formData.get("is_approved") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("testimonials")
    .update({
      is_approved: parsed.data.is_approved,
      approved_at: parsed.data.is_approved ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "testimonials",
    entity_id: parsed.data.id,
    action: parsed.data.is_approved ? "approve" : "unapprove",
  });

  revalidatePath(`/admin/content/testimonials/${parsed.data.id}`);
  revalidatePath("/admin/content/testimonials");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTestimonial(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = IdInput.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid id" };

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("testimonials")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "testimonials",
    entity_id: parsed.data.id,
    action: "delete",
  });

  revalidatePath("/admin/content/testimonials");
  revalidatePath("/reviews");
  return { ok: true };
}

