
import { AdminPageHeader, EmptyNote, FilterPill, Panel } from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { getServerSupabase } from "@/lib/supabase/server";

import { ImportForm, NewTopicForm, SeedButton } from "./import-form";
import TopicRow, { type TopicRowData } from "./topic-row";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "queued", "claimed", "drafted", "published", "skipped", "rejected"] as const;

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status = "all" } = await searchParams;
  const supabase = await getServerSupabase();
  let q = supabase
    .from("content_topics")
    .select(
      "id, keyword, intent, status, priority, target_url, notes, volume, kd, cpc, source, post_id, updated_at, practice_areas(name), counties(name), cities(name)",
    )
    .order("status")
    .order("priority")
    .order("created_at")
    .limit(300);
  if (status !== "all" && (FILTERS as readonly string[]).includes(status)) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;

  type Row = Record<string, unknown> & {
    practice_areas: { name: string } | null;
    counties: { name: string } | null;
    cities: { name: string } | null;
  };
  const rows: TopicRowData[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id as string,
    keyword: r.keyword as string,
    intent: r.intent as string,
    status: r.status as string,
    priority: r.priority as number,
    target_url: (r.target_url as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    volume: (r.volume as number | null) ?? null,
    kd: (r.kd as number | null) ?? null,
    cpc: (r.cpc as number | string | null) ?? null,
    source: r.source as string,
    post_id: (r.post_id as string | null) ?? null,
    practice_area: r.practice_areas?.name ?? null,
    place: r.cities?.name ?? r.counties?.name ?? null,
    updated_at: r.updated_at as string,
  }));

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/content/agent", label: "Content agent" }}
        eyebrow="Content agent"
        title="Topic queue"
        description="What the agent writes next, in priority order (lower runs sooner). Each topic names the money page the post must link to — never compete with."
        actions={<SeedButton />}
      />

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <FilterPill key={s} href={s === "all" ? "/admin/content/agent/topics" : `/admin/content/agent/topics?status=${s}`} active={status === s}>
            {s}
          </FilterPill>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title={`Topics (${rows.length})`}>
          {rows.length === 0 ? (
            <EmptyNote>
              Nothing here. Click <strong className="text-foreground">Seed defaults</strong> to load the Tier 1/2 keyword targets, add one below, or paste an import.
            </EmptyNote>
          ) : (
            <ul className="divide-line m-0 list-none divide-y p-0">
              {rows.map((t) => <TopicRow key={t.id} t={t} />)}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add a topic</CardTitle>
            </CardHeader>
            <CardContent>
              <NewTopicForm practiceAreas={PRACTICE_AREAS.map((p) => ({ slug: p.slug, name: p.name }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Import</CardTitle>
            </CardHeader>
            <CardContent>
              <ImportForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
