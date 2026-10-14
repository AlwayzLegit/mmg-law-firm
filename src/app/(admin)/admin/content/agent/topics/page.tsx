import Link from "next/link";

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
      <Link href="/admin/content/agent" className="text-muted-foreground hover:text-primary text-sm">
        ← Content agent
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Topic queue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            What the agent writes next, in priority order (lower runs sooner).
            Each topic names the money page the post must link to — never compete with.
          </p>
        </div>
        <SeedButton />
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/content/agent/topics" : `/admin/content/agent/topics?status=${s}`}
            className={`border-border rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-secondary"
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topics ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nothing here. Click <strong>Seed defaults</strong> to load the Tier 1/2 keyword targets, add one below, or paste an import.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {rows.map((t) => <TopicRow key={t.id} t={t} />)}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a topic</CardTitle>
            </CardHeader>
            <CardContent>
              <NewTopicForm practiceAreas={PRACTICE_AREAS.map((p) => ({ slug: p.slug, name: p.name }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import</CardTitle>
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
