"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateLegalPage } from "../actions";

type Props = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  body_md: string;
  meta_description: string;
  effective_date: string;
  fallbackBody: string;
};

export default function EditForm(props: Props) {
  const [title, setTitle] = React.useState(props.title);
  const [subtitle, setSubtitle] = React.useState(props.subtitle);
  const [body, setBody] = React.useState(props.body_md);
  const [meta, setMeta] = React.useState(props.meta_description);
  const [effective, setEffective] = React.useState(props.effective_date);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    title !== props.title ||
    subtitle !== props.subtitle ||
    body !== props.body_md ||
    meta !== props.meta_description ||
    effective !== props.effective_date;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLegalPage(fd);
      if (result.ok) toast.success("Legal page saved.");
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
          <CardTitle className="text-base">Heading</CardTitle>
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
            label="Subtitle"
            hint="Optional. Renders below the title (e.g., the CCPA notice line)."
          >
            <TextareaAutosize
              name="subtitle"
              minRows={1}
              maxLength={400}
              value={subtitle}
              onChange={(e) => setSubtitle(e.currentTarget.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field
            label="Effective date"
            hint="Optional. Renders an &quot;Effective YYYY-MM-DD&quot; line under the title."
          >
            <Input
              name="effective_date"
              type="date"
              value={effective}
              onChange={(e) => setEffective(e.currentTarget.value)}
              className="w-48"
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="body_md"
        title="Body"
        value={body}
        onChange={setBody}
        minRows={14}
        maxLength={40000}
        placeholder={
          props.fallbackBody
            ? "Empty — the public page renders the in-code template until you save body copy."
            : "Markdown supported. Use H2 (##) for section breaks."
        }
      />

      {props.fallbackBody ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In-code fallback (reference)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
              {props.fallbackBody}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setBody(props.fallbackBody)}
              disabled={Boolean(body)}
            >
              Copy into editor
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing fields</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
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
