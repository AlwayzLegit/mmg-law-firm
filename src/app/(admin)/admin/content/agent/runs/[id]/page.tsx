import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import ContentHistory from "@/components/admin/content-history";
import { StatusPill, duration } from "@/components/admin/agent-status-pill";
import { AdminPageHeader } from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

import AnswerForm from "../../answer-form";
import FailRunButton from "../../fail-run-button";

type Props = { params: Promise<{ id: string }> };

export default async function RunDetailPage({ params }: Props) {
  const { profile } = await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: run, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!run) notFound();

  const postIds = (run.posts_created as string[]) ?? [];
  const topicIds = [...new Set([...((run.topics_claimed as string[]) ?? []), ...((run.topics_consumed as string[]) ?? [])])];
  const [posts, topics, questions] = await Promise.all([
    postIds.length
      ? supabase.from("blog_posts").select("id, title, slug, review_status, is_published, word_count").in("id", postIds)
      : Promise.resolve({ data: [] as unknown[] }),
    topicIds.length
      ? supabase.from("content_topics").select("id, keyword, status, post_id").in("id", topicIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("agent_questions")
      .select("id, kind, question, context, status, answer, answered_at, created_at, post_id")
      .eq("run_id", id)
      .order("created_at"),
  ]);
  const log = (run.log as Array<{ ts: string; msg: string }>) ?? [];

  return (
    <div>
      <AdminPageHeader
        back={{ href: "/admin/content/agent", label: "Content agent" }}
        eyebrow="Agent run"
        title={run.agent_name}
        description={`Started ${new Date(run.started_at).toLocaleString("en-US")} · ${duration(run.started_at, run.finished_at)}${
          run.instructions_version ? ` · instructions v${run.instructions_version}` : ""
        }`}
        actions={
          <>
            <StatusPill kind="run" value={run.status} />
            {run.status === "running" && profile.role === "owner" ? <FailRunButton id={run.id} /> : null}
          </>
        }
      />
      {run.error ? (
        <p className="mt-4 rounded-[10px] bg-[rgba(220,38,38,.08)] p-3 text-[13px] text-[#b91c1c]">{run.error}</p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {run.summary_md ? (
                <div className="prose prose-sm max-w-none [&_p]:text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{run.summary_md}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">No summary written.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions ({(questions.data ?? []).length})</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              {(questions.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">None.</p>
              ) : (
                (questions.data as Array<Record<string, unknown>>).map((q) => (
                  <div key={q.id as string} className="border-border rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-xs tracking-[0.14em] uppercase">{String(q.kind).replace(/_/g, " ")}</span>
                      <StatusPill kind="question" value={q.status as string} />
                    </div>
                    <p className="mt-1 font-medium">{q.question as string}</p>
                    {q.context ? <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">{q.context as string}</p> : null}
                    {q.status === "answered" ? (
                      <p className="bg-success/5 mt-2 rounded-md p-2 text-xs whitespace-pre-wrap">
                        <span className="text-success font-medium">Answer:</span> {q.answer as string}
                      </p>
                    ) : q.status === "open" ? (
                      <AnswerForm id={q.id as string} />
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report (raw)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-secondary max-h-96 overflow-auto rounded-md p-3 text-xs">{JSON.stringify(run.report ?? {}, null, 2)}</pre>
              {Object.keys((run.metrics as object) ?? {}).length > 0 ? (
                <pre className="bg-secondary mt-3 overflow-auto rounded-md p-3 text-xs">{JSON.stringify(run.metrics, null, 2)}</pre>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Posts ({postIds.length})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {postIds.length === 0 ? (
                <p className="text-muted-foreground">No posts created.</p>
              ) : (
                <ul className="grid gap-2">
                  {(posts.data as Array<Record<string, unknown>>).map((p) => (
                    <li key={p.id as string} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/content/blog/${p.id as string}`} className="hover:text-primary truncate font-medium">
                        {p.title as string}
                      </Link>
                      <span className="text-muted-foreground flex-none text-xs">
                        {p.is_published ? "published" : (p.review_status as string).replace(/_/g, " ")} · {String(p.word_count ?? "?")} w
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Topics ({topicIds.length})</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {topicIds.length === 0 ? (
                <p className="text-muted-foreground">No topics claimed.</p>
              ) : (
                <ul className="grid gap-2">
                  {(topics.data as Array<Record<string, unknown>>).map((t) => (
                    <li key={t.id as string} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.keyword as string}</span>
                      <StatusPill kind="topic" value={t.status as string} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log</CardTitle>
            </CardHeader>
            <CardContent>
              {log.length === 0 ? (
                <p className="text-muted-foreground text-sm">Empty.</p>
              ) : (
                <ol className="max-h-72 overflow-auto text-xs">
                  {log.map((l, i) => (
                    <li key={i} className="border-border flex gap-2 border-b py-1 last:border-0">
                      <time className="text-muted-foreground flex-none tabular-nums">{new Date(l.ts).toLocaleTimeString("en-US")}</time>
                      <span>{l.msg}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <ContentHistory entity="agent_runs" entityId={run.id} />
        </div>
      </div>
    </div>
  );
}
