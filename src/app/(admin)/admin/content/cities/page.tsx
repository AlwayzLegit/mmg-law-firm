import Link from "next/link";

import { AdminPageHeader, EmptyNote, Panel, TonePill, adminCode } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

type Row = {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
  is_priority: boolean;
  intro_md: string | null;
  local_stats_md: string | null;
  counties: { slug: string; name: string };
};

export default async function CitiesIndex() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      `id, slug, name, is_published, is_priority, intro_md, local_stats_md,
       counties!inner(slug, name)`,
    )
    .order("name");

  const rows = (data ?? []) as unknown as Row[];

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const county = r.counties.name;
    if (!grouped.has(county)) grouped.set(county, []);
    grouped.get(county)!.push(r);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Cities"
        description="Click any row to edit its intro and local-stats blocks. Tier-1 (priority) cities get the most editorial attention."
      />

      {error ? (
        <Panel className="mt-6">
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        </Panel>
      ) : rows.length === 0 ? (
        <Panel className="mt-6">
          <EmptyNote>
            No cities yet. Run the <code className={adminCode}>0003_seed_geo.sql</code> migration to seed the Tier-1 set.
          </EmptyNote>
        </Panel>
      ) : (
        <div className="mt-6 grid gap-6">
          {[...grouped.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([county, list]) => (
              <Panel
                key={county}
                title={county}
                action={
                  <span className="text-stone text-xs">
                    {list.filter((c) => c.is_published).length} / {list.length} published
                  </span>
                }
              >
                <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((r) => {
                    const hasContent =
                      Boolean(r.intro_md && r.intro_md.trim().length > 0) ||
                      Boolean(r.local_stats_md && r.local_stats_md.trim().length > 0);
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/admin/content/cities/${r.id}`}
                          className="bg-ink/3 hover:bg-ink/6 text-foreground flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] no-underline transition-colors"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {r.is_priority ? <TonePill tone="warn">Tier 1</TonePill> : null}
                            <span className="truncate font-medium">{r.name}</span>
                          </span>
                          <span className="flex flex-none items-center gap-1.5">
                            {hasContent ? <TonePill tone="good">Copy</TonePill> : null}
                            <TonePill tone={r.is_published ? "ink" : "muted"}>{r.is_published ? "Live" : "Draft"}</TonePill>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
        </div>
      )}
    </div>
  );
}
