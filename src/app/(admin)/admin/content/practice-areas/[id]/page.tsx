import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import { PRACTICE_AREA_CONTENT } from "@/lib/data/practice-area-content";
import type { Subtopic } from "@/lib/data/practice-area-content";
import type { FaqItem } from "@/lib/data/faqs";

import ContentHistory from "@/components/admin/content-history";

import EditForm from "./edit-form";
import PublishControl from "./publish-control";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

const SELECT_COLS = `id, slug, name, intro_md, body_md, subtopics_json, what_to_do_json, faq_json, meta_description, display_order, is_published, created_at, updated_at` as const;

export default async function PracticeAreaEditor({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("practice_areas")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const publicPath = `/practice-areas/${data.slug}`;

  // Pre-fill form fields from the static fallback when DB is empty so the
  // attorney edits *from* the existing copy rather than a blank canvas.
  const fallback = PRACTICE_AREA_CONTENT[data.slug];

  const subtopicsArr = Array.isArray(data.subtopics_json)
    ? (data.subtopics_json as Subtopic[])
    : [];
  const whatToDoArr = Array.isArray(data.what_to_do_json)
    ? (data.what_to_do_json as string[])
    : [];
  const faqsArr = Array.isArray(data.faq_json)
    ? (data.faq_json as FaqItem[])
    : [];

  return (
    <div>
      <Link
        href="/admin/content/practice-areas"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All practice areas
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {data.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              {publicPath}
            </code>
            {data.is_published ? (
              <>
                {" · "}
                <Link
                  href={publicPath}
                  target="_blank"
                  rel="noopener"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open public page ↗
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            data.is_published
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {data.is_published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={data.id}
          slug={data.slug}
          name={data.name}
          intro_md={data.intro_md ?? ""}
          body_md={data.body_md ?? ""}
          meta_description={data.meta_description ?? ""}
          display_order={String(data.display_order ?? 100)}
          subtopics={
            subtopicsArr.length > 0
              ? subtopicsArr
              : (fallback?.subtopics ?? [])
          }
          what_to_do={
            whatToDoArr.length > 0 ? whatToDoArr : (fallback?.whatToDo ?? [])
          }
          faqs={faqsArr.length > 0 ? faqsArr : (fallback?.faqs ?? [])}
          fallbackBody={fallback?.body ?? ""}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishControl
                id={data.id}
                isPublished={data.is_published}
                hasBody={Boolean(data.body_md?.trim())}
                hasFaqs={faqsArr.length > 0}
                hasSubtopics={subtopicsArr.length > 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Pair
                label="Created"
                value={new Date(data.created_at).toLocaleString("en-US")}
              />
              <Pair
                label="Updated"
                value={new Date(data.updated_at).toLocaleString("en-US")}
              />
              <Pair
                label="Display order"
                value={String(data.display_order ?? 100)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Slug, icon, and the lead-form noun are managed in code (used
                by the sitemap and the lead form synchronously). Reach out
                to engineering to add a new practice area or change a slug.
              </p>
              <p>
                The public page renders DB content when{" "}
                <strong className="text-foreground">body</strong> is set
                AND the row is published. Otherwise it falls back to the
                in-code template.
              </p>
            </CardContent>
          </Card>

          <ContentHistory entity="practice_areas" entityId={data.id} />
        </div>
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="break-words">{value}</span>
    </div>
  );
}
