import { AdminPageHeader, EmptyNote, GridHead, GridRow, Panel, TonePill, adminCode } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const COLS = "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_110px_96px_90px]";

export default async function ContentPracticeAreasAdmin() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("practice_areas")
    .select("id, slug, name, intro_md, body_md, is_published, display_order, updated_at")
    .order("display_order");

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Practice areas"
        description="One row per practice area the firm handles. The list is fixed — edit the editorial copy here. Until a row is published, the public page renders the in-code fallback content (marked as such for attorney review)."
      />

      <Panel className="mt-6" title={`Areas (${data?.length ?? 0})`}>
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : !data || data.length === 0 ? (
          <EmptyNote>
            No practice areas in DB yet — apply migration <code className={adminCode}>0005_practice_areas_editor.sql</code> to seed the
            canonical list.
          </EmptyNote>
        ) : (
          <div className="-mx-4">
            <GridHead cols={COLS}>
              <span>Name</span>
              <span>Path</span>
              <span>Copy</span>
              <span>Status</span>
              <span>Updated</span>
            </GridHead>
            {data.map((p) => {
              const hasBody = Boolean(p.body_md?.trim());
              return (
                <GridRow key={p.id} cols={COLS} href={`/admin/content/practice-areas/${p.id}`}>
                  <span className="min-w-0 truncate font-semibold">{p.name}</span>
                  <span className="text-stone min-w-0 truncate font-mono text-xs">/practice-areas/{p.slug}</span>
                  <span>{hasBody ? <TonePill tone="good">Body set</TonePill> : <TonePill tone="warn">Fallback copy</TonePill>}</span>
                  <span>
                    <TonePill tone={p.is_published ? "ink" : "muted"}>{p.is_published ? "Published" : "Draft"}</TonePill>
                  </span>
                  <time dateTime={p.updated_at} className="text-stone text-xs">
                    {new Date(p.updated_at).toLocaleDateString("en-US")}
                  </time>
                </GridRow>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
