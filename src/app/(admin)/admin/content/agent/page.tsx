import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, HelpCircle, ListTodo, ScrollText } from "lucide-react";

import { StatusPill, duration, timeAgo } from "@/components/admin/agent-status-pill";
import { AdminPageHeader, EmptyNote, Panel, StatCard, adminBtn, adminCode } from "@/components/admin/ui";
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
      <AdminPageHeader
        eyebrow="Content"
        title={
          <span className="inline-flex items-center gap-3">
            <span className="bg-ink text-gold inline-flex h-9 w-9 items-center justify-center rounded-[10px]">
              <Bot className="h-5 w-5" aria-hidden />
            </span>
            Content agent
          </span>
        }
        description="Runs, reports and questions from the daily blog-writing agent. Every post it writes lands as a draft awaiting your review."
        actions={
          <>
            <Link href="/admin/content/agent/topics" className={adminBtn.outline}>
              <ListTodo className="h-3.5 w-3.5" aria-hidden /> Topic queue
            </Link>
            <Link href="/admin/content/agent/instructions" className={adminBtn.outline}>
              <ScrollText className="h-3.5 w-3.5" aria-hidden /> Instructions {inst ? `v${inst.version}` : ""}
            </Link>
            {profile.role === "owner" ? (
              <Link href="/admin/settings/api-keys" className={adminBtn.outline}>
                API keys ({(keys as { count: number | null }).count ?? 0})
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open questions" value={questions.length} href="#questions" sub={questions.length > 0 ? "need an answer" : "none open"} tone={questions.length > 0 ? "warn" : "default"} />
        <StatCard label="Drafts awaiting review" value={review.length} href="/admin/content/blog?status=needs_review" sub={review.length > 0 ? "open the queue" : "all reviewed"} tone={review.length > 0 ? "warn" : "default"} />
        <StatCard label="Topics queued" value={topicCounts.queued ?? 0} href="/admin/content/agent/topics?status=queued" sub="next to write" />
        <StatCard label="Posts published by agent" value={topicCounts.published ?? 0} href="/admin/content/blog?status=published" sub="topics completed" />
      </div>

      {questions.length > 0 ? (
        <Panel
          id="questions"
          className="mt-6 ring-gold/50"
          title={
            <span className="inline-flex items-center gap-2">
              <HelpCircle className="text-gold-deep h-4 w-4" aria-hidden />
              The agent needs your input ({questions.length})
            </span>
          }
        >
          <div className="grid gap-4">
            {questions.map((q) => (
              <div key={q.id} className="bg-ink/3 rounded-[10px] p-4 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="micro-label text-stone">
                    {q.kind.replace(/_/g, " ")} · asked {timeAgo(q.created_at)} ·{" "}
                    <Link href={`/admin/content/agent/runs/${q.run_id}`} className="text-stone hover:text-gold-deep no-underline hover:underline">
                      run
                    </Link>
                    {q.post_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/content/blog/${q.post_id}`} className="text-stone hover:text-gold-deep no-underline hover:underline">
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
          </div>
        </Panel>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Runs">
            {runs.length === 0 ? (
              <EmptyNote>
                No runs yet. Create an API key under Settings → API keys, then
                follow <code className={adminCode}>docs/content-agent-runbook.md</code>.
              </EmptyNote>
            ) : (
              <ul className="divide-line m-0 list-none divide-y p-0 text-[13px]">
                {runs.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/content/agent/runs/${r.id}`} className="text-foreground hover:text-gold-deep font-semibold no-underline">
                        {r.agent_name}
                      </Link>
                      <p className="text-stone m-0 truncate text-xs">
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
        </Panel>

        <div className="space-y-6">
          <Panel title="Latest report">
            {latest?.summary_md ? (
              <div className="prose prose-sm max-w-none text-[13px] [&_h1]:text-[15px] [&_h2]:text-[13px] [&_p]:text-stone">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{latest.summary_md}</ReactMarkdown>
              </div>
            ) : (
              <EmptyNote>No report yet.</EmptyNote>
            )}
            {latest ? (
              <Link href={`/admin/content/agent/runs/${latest.id}`} className="text-gold-deep mt-3 inline-block text-xs font-semibold no-underline hover:underline">
                Full run detail →
              </Link>
            ) : null}
          </Panel>

          <Panel title="Awaiting your review">
            {review.length === 0 ? (
              <EmptyNote>Nothing to review.</EmptyNote>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0 text-[13px]">
                {review.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/content/blog/${p.id}`} className="text-foreground hover:text-gold-deep truncate font-semibold no-underline">
                      {p.title}
                    </Link>
                    <span className="text-stone flex-none text-xs">{timeAgo(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
