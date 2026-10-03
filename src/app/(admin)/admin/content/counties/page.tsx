import Link from "next/link";

import { AdminPageHeader, Panel, TonePill } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

type Row = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  is_published: boolean;
  intro_md: string | null;
  local_stats_md: string | null;
};

export default async function CountiesIndex() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("counties")
    .select("id, slug, name, region, is_published, intro_md, local_stats_md")
    .order("name");

  const rows = (data ?? []) as Row[];

  // Group by region for legibility — there are 58 of these.
  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const region = r.region ?? "Other";
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region)!.push(r);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Counties"
        description="All 58 California counties. Click any row to edit its intro and local-stats blocks. Publish toggles per row."
      />

      {error ? (
        <Panel className="mt-6">
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        </Panel>
      ) : (
        <div className="mt-6 grid gap-6">
          {[...grouped.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([region, list]) => (
              <Panel
                key={region}
                title={region}
                action={
                  <span className="text-stone text-xs">
                    {list.filter((r) => r.is_published).length} / {list.length} published
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
                          href={`/admin/content/counties/${r.id}`}
                          className="bg-ink/3 hover:bg-ink/6 text-foreground flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] no-underline transition-colors"
                        >
                          <span className="truncate font-medium">{r.name}</span>
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
