import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";

import RedirectsManager, { type RedirectRow } from "./redirects-manager";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function RedirectsPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("redirects")
    .select("id, source_path, destination, permanent")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as RedirectRow[];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Redirects"
        description="Send an old or changed URL to a new one. Applied site-wide within a minute of saving. Use 301 (permanent) for SEO-preserving moves."
      />

      <Panel className="mt-6" title={`${rows.length} ${rows.length === 1 ? "redirect" : "redirects"}`}>
        {error ? <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p> : <RedirectsManager rows={rows} />}
      </Panel>
    </div>
  );
}
