import { AdminPageHeader, Avatar, EmptyNote, GridHead, GridRow, Panel, TonePill } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";

import NewAttorneyForm from "./new-attorney-form";
import { requireAdmin } from "@/lib/auth/require-admin";

const COLS = "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_96px_90px]";

export default async function ContentAttorneysAdmin() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("attorney_profiles")
    .select("id, slug, full_name, job_title, bar_number, is_published, headshot_url, updated_at")
    .order("display_order")
    .order("full_name");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Attorney profiles"
        description="One row per attorney. The published row drives the bio page, attorney card on the homepage, and the Person JSON-LD used by search engines."
        actions={<NewAttorneyForm />}
      />

      <Panel className="mt-6" title={`Profiles (${data?.length ?? 0})`}>
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : !data || data.length === 0 ? (
          <EmptyNote>
            No attorneys yet. Click <strong className="text-foreground">New attorney</strong> to create one. The seed migration adds
            Mihran&apos;s row automatically.
          </EmptyNote>
        ) : (
          <div className="-mx-4">
            <GridHead cols={COLS}>
              <span>Attorney</span>
              <span>Bar number</span>
              <span>Path</span>
              <span>Status</span>
              <span>Updated</span>
            </GridHead>
            {data.map((p) => (
              <GridRow key={p.id} cols={COLS} href={`/admin/content/attorneys/${p.id}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={p.full_name} src={p.headshot_url} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.full_name}</span>
                    {p.job_title ? <span className="text-stone block truncate text-xs">{p.job_title}</span> : null}
                  </span>
                </span>
                <span className="text-stone tabular-nums">CA Bar #{p.bar_number}</span>
                <span className="text-stone min-w-0 truncate font-mono text-xs">/attorneys/{p.slug}</span>
                <span>
                  <TonePill tone={p.is_published ? "ink" : "muted"}>{p.is_published ? "Published" : "Draft"}</TonePill>
                </span>
                <time dateTime={p.updated_at} className="text-stone text-xs">
                  {new Date(p.updated_at).toLocaleDateString("en-US")}
                </time>
              </GridRow>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
