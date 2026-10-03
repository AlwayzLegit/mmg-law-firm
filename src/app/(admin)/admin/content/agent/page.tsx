import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, HelpCircle, ListTodo, ScrollText } from "lucide-react";

import { StatusPill, duration, timeAgo } from "@/components/admin/agent-status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

import AnswerForm from "./answer-form";
import FailRunButton from "./fail-run-button";

export const dynamic = "force-dynamic";

type Run = {
  id: string;
  agent_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary_md: string | null;
  posts_created: string[];
  topics_claimed: string[];
  error: string | null;
};
type Question = {
  id: string;
  run_id: string;
  kind: string;
  question: string;
  context: string | null;
  created_at: string;
  topic_id: string | null;
  post_id: string | null;
};

export default async function ContentAgentPage() {
  const { profile } = await requireAdmin();
  const supabase = await getServerSupabase();
  const [runsRes, openQ, counts, needsReview, instructions, keys] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("id, agent_name, status, started_at, finished_at, summary_md, posts_created, topics_claimed, error")
      .order("started_at", { ascending: false })
      .limit(25),
    supabase
      .from("agent_questions")
      .select("id, run_id, kind, question, context, created_at, topic_id, post_id")
      .eq("status", "open")
      .order("created_at"),
    supabase.from("content_topics").select("status"),
    supabase.from("blog_posts").select("id, title, created_at").eq("review_status", "needs_review").order("created_at", { ascending: false }).limit(10),
    supabase.from("agent_instructions").select("version, created_at, change_note").order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("api_keys").select("id", { count: "exact", head: true }).is("revoked_at", null),
  ]);

  const runs = (runsRes.data ?? []) as Run[];
  const questions = (openQ.data ?? []) as Question[];
  const topicCounts: Record<string, number> = {};
  for (const r of (counts.data ?? []) as Array<{ status: string }>) topicCounts[r.status] = (topicCounts[r.status] ?? 0) + 1;
  const latest = runs.find((r) => r.status !== "running") ?? runs[0] ?? null;
  const inst = instructions.data as { version: number; created_at: string; change_note: string | null } | null;
  const review = (needsReview.data ?? []) as Array<{ id: string; title: string; created_at: string }>;

  return (
    <div>
      <Link href="/admin/content/pages" className="text-muted-foreground hover:text-primary text-sm">
        ← Content
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-medium tracking-tight">
            <Bot className="h-5 w-5" aria-hidden /> Content agent
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Runs, reports and questions from the daily blog-writing agent. Every
            post it writes lands as a draft awaiting your review.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin/content/agent/topics" className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium">
            <ListTodo className="h-3.5 w-3.5" aria-hidden /> Topic queue
          </Link>
          <Link href="/admin/content/agent/instructions" className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium">
            <ScrollText className="h-3.5 w-3.5" aria-hidden /> Instructions {inst ? `v${inst.version}` : ""}
          </Link>
          {profile.role === "owner" ? (
            <Link href="/admin/settings/api-keys" className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium">
              API keys ({(keys as { count: number | null }).count ?? 0})
            </Link>
          ) : null}
        </nav>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open questions" value={questions.length} href="#questions" tone={questions.length > 0 ? "warn" : undefined} />
        <Stat label="Drafts awaiting review" value={review.length} href="/admin/content/blog?status=needs_review" tone={review.length > 0 ? "warn" : undefined} />
        <Stat label="Topics queued" value={topicCounts.queued ?? 0} href="/admin/content/agent/topics?status=queued" />
        <Stat label="Posts published by agent" value={topicCounts.published ?? 0} href="/admin/content/blog?status=published" />
      </div>

      {questions.length > 0 ? (
        <Card id="questions" className="border-warning/40 bg-warning/5 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="text-warning h-4 w-4" aria-hidden />
              The agent needs your input ({questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {questions.map((q) => (
              <div key={q.id} className="border-border bg-card rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs tracking-[0.14em] uppercase">
                    {q.kind.replace(/_/g, " ")} · asked {timeAgo(q.created_at)} ·{" "}
                    <Link href={`/admin/content/agent/runs/${q.run_id}`} className="hover:text-primary underline-offset-4 hover:underline">
                      run
                    </Link>
                    {q.post_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/content/blog/${q.post_id}`} className="hover:text-primary underline-offset-4 hover:underline">
                          post
                        </Link>
                      </>
                    ) : null}
                  </span>
                </div>
                <p className="mt-2 font-medium">{q.question}</p>
                {q.context ? <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">{q.context}</p> : null}
                <AnswerForm id={q.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No runs yet. Create an API key under Settings → API keys, then
                follow <code className="bg-secondary rounded px-1 py-0.5 text-xs">docs/content-agent-runbook.md</code>.
              </p>
            ) : (
              <ul className="divide-border divide-y text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/content/agent/runs/${r.id}`} className="hover:text-primary font-medium">
                        {r.agent_name}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {new Date(r.started_at).toLocaleString("en-US")} · {duration(r.started_at, r.finished_at)} ·{" "}
                        {r.posts_created.length} post{r.posts_created.length === 1 ? "" : "s"} · {r.topics_claimed.length} topic
                        {r.topics_claimed.length === 1 ? "" : "s"}
                        {r.error ? ` · ${r.error}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <StatusPill kind="run" value={r.status} />
                      {r.status === "running" && profile.role === "owner" ? <FailRunButton id={r.id} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest report</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {latest?.summary_md ? (
                <div className="prose prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_p]:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{latest.summary_md}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">No report yet.</p>
              )}
              {latest ? (
                <Link href={`/admin/content/agent/runs/${latest.id}`} className="text-primary mt-3 inline-block text-xs font-medium hover:underline">
                  Full run detail →
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Awaiting your review</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {review.length === 0 ? (
                <p className="text-muted-foreground">Nothing to review.</p>
              ) : (
                <ul className="grid gap-2">
                  {review.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3">
                      <Link href={`/admin/content/blog/${p.id}`} className="hover:text-primary truncate font-medium">
                        {p.title}
                      </Link>
                      <span className="text-muted-foreground flex-none text-xs">{timeAgo(p.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "warn" }) {
  return (
    <Link href={href} className="block">
      <Card className={tone === "warn" && value > 0 ? "border-warning/40" : "hover:border-primary/30 transition-colors"}>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">{label}</p>
          <p className="font-display mt-2 text-3xl font-medium tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
