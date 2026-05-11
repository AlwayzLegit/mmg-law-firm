"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Subtopic } from "@/lib/data/practice-area-content";
import type { FaqItem } from "@/lib/data/faqs";

import { updatePracticeArea } from "../actions";

type Props = {
  id: string;
  slug: string;
  name: string;
  intro_md: string;
  body_md: string;
  meta_description: string;
  display_order: string;
  subtopics: Subtopic[];
  what_to_do: string[];
  faqs: FaqItem[];
  /** Static fallback body — shown as a reference panel above the editor. */
  fallbackBody: string;
};

export default function EditForm(props: Props) {
  const initialKey = React.useMemo(
    () =>
      JSON.stringify({
        intro_md: props.intro_md,
        body_md: props.body_md,
        meta_description: props.meta_description,
        display_order: props.display_order,
        subtopics: props.subtopics,
        what_to_do: props.what_to_do,
        faqs: props.faqs,
      }),
    [props],
  );

  const [intro, setIntro] = React.useState(props.intro_md);
  const [body, setBody] = React.useState(props.body_md);
  const [meta, setMeta] = React.useState(props.meta_description);
  const [order, setOrder] = React.useState(props.display_order);
  const [subtopics, setSubtopics] = React.useState<Subtopic[]>(props.subtopics);
  const [whatToDo, setWhatToDo] = React.useState<string[]>(props.what_to_do);
  const [faqs, setFaqs] = React.useState<FaqItem[]>(props.faqs);
  const [pending, startTransition] = React.useTransition();

  const currentKey = JSON.stringify({
    intro_md: intro,
    body_md: body,
    meta_description: meta,
    display_order: order,
    subtopics,
    what_to_do: whatToDo,
    faqs,
  });
  const dirty = currentKey !== initialKey;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("subtopics_json", JSON.stringify(subtopics));
    fd.set("what_to_do_json", JSON.stringify(whatToDo));
    fd.set("faq_json", JSON.stringify(faqs));
    startTransition(async () => {
      const result = await updatePracticeArea(fd);
      if (result.ok) toast.success("Practice area saved.");
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
          <CardTitle className="text-base">Hero copy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Intro"
            hint="Short blurb shown under the page title and used as the meta description fallback."
          >
            <TextareaAutosize
              name="intro_md"
              minRows={2}
              maxLength={800}
              value={intro}
              onChange={(e) => setIntro(e.currentTarget.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="body_md"
        title="Body"
        value={body}
        onChange={setBody}
        minRows={10}
        maxLength={20000}
        placeholder={
          props.fallbackBody
            ? "Empty — the public page renders the in-code fallback below until you save body copy."
            : "Long-form body. Markdown supported."
        }
        hint={
          props.fallbackBody
            ? "Tip: paste the in-code fallback below as a starting point if you want to refine it rather than start blank."
            : undefined
        }
      />

      {props.fallbackBody ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In-code fallback (reference)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {props.fallbackBody}
            </p>
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
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>Subtopics</span>
            <span className="text-xs font-normal text-muted-foreground">
              {subtopics.length} / 20
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            Cards rendered under “What we handle” on the public page. Title +
            short body each.
          </p>
          {subtopics.length === 0 ? (
            <p className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              No subtopics — the “What we handle” block won&apos;t render.
            </p>
          ) : null}
          {subtopics.map((s, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Subtopic {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSubtopics((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove subtopic"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <Input
                value={s.title}
                onChange={(e) =>
                  setSubtopics((arr) => {
                    const next = [...arr];
                    next[i] = { ...next[i], title: e.currentTarget.value };
                    return next;
                  })
                }
                placeholder="Title"
                maxLength={160}
              />
              <TextareaAutosize
                value={s.body}
                onChange={(e) =>
                  setSubtopics((arr) => {
                    const next = [...arr];
                    next[i] = { ...next[i], body: e.currentTarget.value };
                    return next;
                  })
                }
                placeholder="Body"
                minRows={2}
                maxLength={2000}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSubtopics((arr) => [...arr, { title: "", body: "" }])
            }
            disabled={subtopics.length >= 20}
            className="w-fit gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add subtopic
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>What to do right away</span>
            <span className="text-xs font-normal text-muted-foreground">
              {whatToDo.length} / 20
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-xs text-muted-foreground">
            Checklist rendered in the “What to do right away” callout. One
            line per item.
          </p>
          {whatToDo.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <TextareaAutosize
                value={line}
                onChange={(e) =>
                  setWhatToDo((arr) => {
                    const next = [...arr];
                    next[i] = e.currentTarget.value;
                    return next;
                  })
                }
                minRows={1}
                maxLength={400}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setWhatToDo((arr) => arr.filter((_, idx) => idx !== i))
                }
                className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWhatToDo((arr) => [...arr, ""])}
            disabled={whatToDo.length >= 20}
            className="w-fit gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>FAQs</span>
            <span className="text-xs font-normal text-muted-foreground">
              {faqs.length} / 30
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            FAQ pairs rendered at the bottom of the page and emitted as
            FAQPage JSON-LD. Question + answer each.
          </p>
          {faqs.map((f, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-md border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  FAQ {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFaqs((arr) => arr.filter((_, idx) => idx !== i))
                  }
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <Input
                value={f.question}
                onChange={(e) =>
                  setFaqs((arr) => {
                    const next = [...arr];
                    next[i] = { ...next[i], question: e.currentTarget.value };
                    return next;
                  })
                }
                placeholder="Question"
                maxLength={400}
              />
              <TextareaAutosize
                value={f.answer}
                onChange={(e) =>
                  setFaqs((arr) => {
                    const next = [...arr];
                    next[i] = { ...next[i], answer: e.currentTarget.value };
                    return next;
                  })
                }
                placeholder="Answer"
                minRows={2}
                maxLength={4000}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFaqs((arr) => [...arr, { question: "", answer: "" }])
            }
            disabled={faqs.length >= 30}
            className="w-fit gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add FAQ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing fields</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Meta description"
            hint={`${meta.length} / 160 ideal — 220 max. Empty falls back to intro.`}
          >
            <Input
              name="meta_description"
              maxLength={220}
              value={meta}
              onChange={(e) => setMeta(e.currentTarget.value)}
            />
          </Field>
          <Field label="Display order" hint="Lower numbers come first.">
            <Input
              name="display_order"
              type="number"
              min={0}
              max={9999}
              value={order}
              onChange={(e) => setOrder(e.currentTarget.value)}
              className="w-32"
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
