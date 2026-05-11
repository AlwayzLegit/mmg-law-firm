"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FaqItem } from "@/lib/data/faqs";

import { updateFirmSettings } from "./actions";

type Props = {
  founded_year: string;
  yelp_url: string;
  super_lawyers_url: string;
  homepage_faqs: FaqItem[];
  /** In-code fallback list. Shown as a "Reset to fallback" affordance and
   *  used to detect whether the editor is currently displaying the fallback
   *  vs DB content. */
  fallbackFaqs: FaqItem[];
};

export default function EditForm(props: Props) {
  const initialKey = React.useMemo(
    () =>
      JSON.stringify({
        founded_year: props.founded_year,
        yelp_url: props.yelp_url,
        super_lawyers_url: props.super_lawyers_url,
        homepage_faqs: props.homepage_faqs,
      }),
    [props],
  );

  const [year, setYear] = React.useState(props.founded_year);
  const [yelp, setYelp] = React.useState(props.yelp_url);
  const [superLawyers, setSuperLawyers] = React.useState(props.super_lawyers_url);
  const [faqs, setFaqs] = React.useState<FaqItem[]>(props.homepage_faqs);
  const [pending, startTransition] = React.useTransition();

  const currentKey = JSON.stringify({
    founded_year: year,
    yelp_url: yelp,
    super_lawyers_url: superLawyers,
    homepage_faqs: faqs,
  });
  const dirty = currentKey !== initialKey;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("homepage_faqs_json", JSON.stringify(faqs));
    startTransition(async () => {
      const result = await updateFirmSettings(fd);
      if (result.ok) toast.success("Firm settings saved.");
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Firm-level facts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Founding year"
            hint="Surfaced in the footer (&quot;Established YYYY&quot;). Leave empty to omit."
          >
            <Input
              name="founded_year"
              type="number"
              min={1900}
              max={2099}
              value={year}
              onChange={(e) => setYear(e.currentTarget.value)}
              className="w-32"
            />
          </Field>
          <Field
            label="Yelp URL"
            hint="Firm-level Yelp business listing. Surfaced in LegalService JSON-LD sameAs."
          >
            <Input
              name="yelp_url"
              type="url"
              value={yelp}
              onChange={(e) => setYelp(e.currentTarget.value)}
              placeholder="https://www.yelp.com/biz/..."
            />
          </Field>
          <Field
            label="Super Lawyers URL"
            hint="Firm-level Super Lawyers profile. Surfaced in LegalService JSON-LD sameAs. (Per-attorney profile lives on the attorney row.)"
          >
            <Input
              name="super_lawyers_url"
              type="url"
              value={superLawyers}
              onChange={(e) => setSuperLawyers(e.currentTarget.value)}
              placeholder="https://profiles.superlawyers.com/..."
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between text-base">
            <span>Homepage FAQs</span>
            <span className="text-xs font-normal text-muted-foreground">
              {faqs.length} / 30
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            Cross-practice-area FAQs rendered at the bottom of the homepage.
            Saved entries replace the in-code fallback. Per-practice-area
            FAQs live on each practice-area row.
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFaqs((arr) => [...arr, { question: "", answer: "" }])
              }
              disabled={faqs.length >= 30}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add FAQ
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFaqs(props.fallbackFaqs)}
              disabled={
                JSON.stringify(faqs) === JSON.stringify(props.fallbackFaqs)
              }
            >
              Reset to in-code fallback
            </Button>
          </div>
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
