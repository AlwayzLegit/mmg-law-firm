"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

const FaqSchema = z.object({
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(4000),
});

const UpdateInput = z.object({
  founded_year: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Founding year must be a four-digit year")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  yelp_url: z
    .string()
    .trim()
    .url("Yelp URL must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  super_lawyers_url: z
    .string()
    .trim()
    .url("Super Lawyers URL must be a full URL (or empty)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  homepage_faqs_json: z.string().optional().nullable(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateFirmSettings(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = UpdateInput.safeParse({
    founded_year: formData.get("founded_year"),
    yelp_url: formData.get("yelp_url"),
    super_lawyers_url: formData.get("super_lawyers_url"),
    homepage_faqs_json: formData.get("homepage_faqs_json"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const year = parsed.data.founded_year
    ? Number(parsed.data.founded_year)
    : null;

  // Validate homepage FAQs entry-by-entry.
  const faqs: Array<{ question: string; answer: string }> = [];
  if (parsed.data.homepage_faqs_json && parsed.data.homepage_faqs_json.trim()) {
    let raw: unknown;
    try {
      raw = JSON.parse(parsed.data.homepage_faqs_json);
    } catch {
      return { ok: false, error: "Homepage FAQs — malformed JSON from editor." };
    }
    if (!Array.isArray(raw)) {
      return { ok: false, error: "Homepage FAQs — expected an array." };
    }
    if (raw.length > 30) {
      return { ok: false, error: "Homepage FAQs — too many entries (max 30)." };
    }
    for (let i = 0; i < raw.length; i++) {
      const r = FaqSchema.safeParse(raw[i]);
      if (!r.success) {
        const msg = r.error.issues[0]?.message ?? "invalid";
        return { ok: false, error: `Homepage FAQ ${i + 1}: ${msg}` };
      }
      faqs.push(r.data);
    }
  }

  const supabase = await getServerSupabase();

  // Upsert into the singleton row. The CHECK constraint on id ensures only
  // id = 1 is valid; the seed inserts that row, so this should always be
  // an UPDATE in practice, but upsert is robust to a fresh DB.
  const { error } = await supabase
    .from("firm_settings")
    .upsert(
      {
        id: 1,
        founded_year: year,
        yelp_url: parsed.data.yelp_url ?? null,
        super_lawyers_url: parsed.data.super_lawyers_url ?? null,
        homepage_faqs_json: faqs,
      },
      { onConflict: "id" },
    );
  if (error) return { ok: false, error: error.message };

  void supabase.from("audit_log").insert({
    actor_id: user.id,
    entity: "firm_settings",
    entity_id: null,
    action: "edit",
  });

  revalidatePath("/admin/settings/firm");
  revalidatePath("/admin/settings");
  // The footer + schema graph appear on every page, so revalidate broadly.
  revalidatePath("/", "layout");

  return { ok: true };
}
