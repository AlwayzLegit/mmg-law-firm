import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Jump to the next lead to work: the oldest still-untriaged ("new") lead,
 * so first-response time (the firm's #1 conversion lever) stays low. When the
 * queue is empty, falls back to the filtered list so the admin sees it's clear.
 *
 * A static segment, so it resolves ahead of /admin/leads/[id].
 */
export async function GET(): Promise<Response> {
  await requireAdmin();
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    redirect(`/admin/leads/${data.id}?from=status%3Dnew`);
  }
  redirect("/admin/leads?status=new");
}
