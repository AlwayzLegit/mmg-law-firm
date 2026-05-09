"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateBlogPost } from "../actions";

type Props = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  body_md: string;
  excerpt: string;
  hero_image_url: string;
  meta_description: string;
  tags: string;
  /** ISO datetime string or empty. */
  published_at: string;
};

export default function EditForm(props: Props) {
  const [title, setTitle] = React.useState(props.title);
  const [slug, setSlug] = React.useState(props.slug);
  const [subtitle, setSubtitle] = React.useState(props.subtitle);
  const [body, setBody] = React.useState(props.body_md);
  const [excerpt, setExcerpt] = React.useState(props.excerpt);
  const [heroUrl, setHeroUrl] = React.useState(props.hero_image_url);
  const [meta, setMeta] = React.useState(props.meta_description);
  const [tags, setTags] = React.useState(props.tags);
  const [publishedAt, setPublishedAt] = React.useState(
    isoToInput(props.published_at),
  );
  const [pending, startTransition] = React.useTransition();

  const dirty =
    title !== props.title ||
    slug !== props.slug ||
    subtitle !== props.subtitle ||
    body !== props.body_md ||
    excerpt !== props.excerpt ||
    heroUrl !== props.hero_image_url ||
    meta !== props.meta_description ||
    tags !== props.tags ||
    publishedAt !== isoToInput(props.published_at);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateBlogPost(fd);
      if (result.ok) toast.success("Post saved.");
      else toast.error(result.error);
    });
  }

  React.useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <form onSubmit={onSave} className="grid gap-6">
      <input type="hidden" name="id" value={props.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Headline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Title">
            <Input
              name="title"
              required
              minLength={2}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
            />
          </Field>
          <Field
            label="Slug"
            hint="Lowercase letters, numbers, hyphens only. URL: /blog/{slug}"
          >
            <Input
              name="slug"
              required
              pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
              minLength={2}
              maxLength={80}
              value={slug}
              onChange={(e) => setSlug(e.currentTarget.value)}
            />
          </Field>
          <Field label="Subtitle (optional)">
            <Input
              name="subtitle"
              maxLength={220}
              value={subtitle}
              onChange={(e) => setSubtitle(e.currentTarget.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="body_md"
        title="Body"
        value={body}
        onChange={setBody}
        minRows={12}
        maxLength={50000}
        placeholder="The post itself. Markdown is supported. Use H2 (##) for section breaks."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing fields</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Excerpt"
            hint="What appears under the title on the blog index. Aim for 1–2 sentences."
          >
            <TextareaAutosize
              name="excerpt"
              minRows={2}
              maxLength={400}
              value={excerpt}
              onChange={(e) => setExcerpt(e.currentTarget.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field
            label="Hero image URL"
            hint="Optional. Use a Supabase Storage public URL — the matching hostname is allow-listed in next.config.ts."
          >
            <Input
              name="hero_image_url"
              type="url"
              value={heroUrl}
              onChange={(e) => setHeroUrl(e.currentTarget.value)}
              placeholder="https://your-project.supabase.co/storage/v1/object/public/..."
            />
          </Field>
          <Field
            label="Tags"
            hint="Comma-separated. Up to 16 tags. Used for display and to support related-post groupings later."
          >
            <Input
              name="tags"
              maxLength={400}
              value={tags}
              onChange={(e) => setTags(e.currentTarget.value)}
              placeholder="car-accidents, glendale, insurance"
            />
          </Field>
          <Field
            label="Meta description"
            hint={`${meta.length} / 160 ideal — 220 max.`}
          >
            <Input
              name="meta_description"
              maxLength={220}
              value={meta}
              onChange={(e) => setMeta(e.currentTarget.value)}
            />
          </Field>
          <Field
            label="Publish date / time"
            hint="Future date schedules the post. Empty + published = published_at set to now on flip."
          >
            <Input
              name="published_at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.currentTarget.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Convert ISO datetime to the format the <input type="datetime-local"> wants. */
function isoToInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local wants 'YYYY-MM-DDTHH:MM' in local time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
