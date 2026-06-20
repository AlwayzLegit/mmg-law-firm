"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { logAudit } from "@/lib/audit";
import { getServiceSupabase } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Source must be a root-relative path with no query/hash/space.
const PathRe = /^\/[^\s?#]*$/;

const CreateInput = z.object({
  source_path: z
    .string()
    .trim()
    .regex(PathRe, "Source must be a path like /old-page")
    .max(512),
  destination: z.string().trim().min(1).max(2048),
  permanent: z.boolean(),
});

export async function createRedirect(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = CreateInput.safeParse({
    source_path: formData.get("source_path"),
    destination: formData.get("destination"),
    permanent: formData.get("permanent") === "true",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const dest = parsed.data.destination;
  if (!dest.startsWith("/") && !/^https?:\/\//.test(dest)) {
    return {
      ok: false,
      error: "Destination must be a path (/new) or a full URL (https://...).",
    };
  }
  if (dest === parsed.data.source_path) {
    return { ok: false, error: "Source and destination are identical." };
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("redirects").insert({
    source_path: parsed.data.source_path,
    destination: dest,
    permanent: parsed.data.permanent,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "A redirect for that source path already exists."
          : error.message,
    };
  }

  logAudit({
    actor_id: user.id,
    entity: "redirects",
    entity_id: null,
    action: "create",
    diff: { source: parsed.data.source_path, destination: dest },
  });
  revalidatePath("/admin/content/redirects");
  return { ok: true };
}

export async function deleteRedirect(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid id" };
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "redirects",
    entity_id: id,
    action: "delete",
  });
  revalidatePath("/admin/content/redirects");
  return { ok: true };
}
