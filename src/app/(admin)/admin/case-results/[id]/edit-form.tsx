"use client";

import * as React from "react";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateCaseResult } from "../actions";

type Props = {
  id: string;
  headline: string;
  /** stringified bigint */
  amount_cents: string;
  amount_display: string;
  practice_area_id: string;
  county_id: string;
  year: number;
  anonymized_summary_md: string;
  practiceAreas: { id: string; name: string }[];
  counties: { id: string; name: string }[];
};

export default function EditForm(props: Props) {
  const [headline, setHeadline] = React.useState(props.headline);
  const [amountCents, setAmountCents] = React.useState(props.amount_cents);
  const [amountDisplay, setAmountDisplay] = React.useState(props.amount_display);
  const [practice, setPractice] = React.useState(props.practice_area_id);
  const [county, setCounty] = React.useState(props.county_id);
  const [year, setYear] = React.useState(props.year);
  const [summary, setSummary] = React.useState(props.anonymized_summary_md);
  const [pending, startTransition] = React.useTransition();

  const dirty =
    headline !== props.headline ||
    amountCents !== props.amount_cents ||
    amountDisplay !== props.amount_display ||
    practice !== props.practice_area_id ||
    county !== props.county_id ||
    year !== props.year ||
    summary !== props.anonymized_summary_md;

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCaseResult(fd);
      if (result.ok) toast.success("Saved.");
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
        <CardContent>
          <Input
            name="headline"
            required
            minLength={8}
            maxLength={220}
            value={headline}
            onChange={(e) => setHeadline(e.currentTarget.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            What appears as the card title (e.g., &ldquo;$1.2M settlement —
            pedestrian struck in crosswalk&rdquo;).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Amount + classification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Amount (cents)"
            hint="Optional — only used for filtering / sorting later. Not displayed directly."
          >
            <Input
              name="amount_cents"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={15}
              value={amountCents}
              onChange={(e) =>
                setAmountCents(e.currentTarget.value.replace(/[^\d]/g, ""))
              }
              placeholder="120000000"
            />
          </Field>
          <Field
            label="Amount (display)"
            hint="What renders on the card."
          >
            <Input
              name="amount_display"
              maxLength={40}
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.currentTarget.value)}
              placeholder="$1.2 million"
            />
          </Field>
          <Field label="Practice area">
            <select
              name="practice_area_id"
              value={practice}
              onChange={(e) => setPractice(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(20,30,80,0.04)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">—</option>
              {props.practiceAreas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="County">
            <select
              name="county_id"
              value={county}
              onChange={(e) => setCounty(e.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(20,30,80,0.04)] transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <option value="">—</option>
              {props.counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" hint="Optional">
            <Input
              name="year"
              type="number"
              min={1980}
              max={2100}
              value={year ? String(year) : ""}
              onChange={(e) => {
                const v = parseInt(e.currentTarget.value, 10);
                setYear(Number.isFinite(v) ? v : 0);
              }}
              placeholder={String(new Date().getFullYear())}
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="anonymized_summary_md"
        title="Anonymized summary (required)"
        value={summary}
        onChange={setSummary}
        minRows={6}
        maxLength={20000}
        placeholder="Describe the matter without identifying the client. Mention the cause of injury, scope of treatment, liability dynamics, and how the result was achieved."
        hint="Per CRPC §7.1, never include client names, exact dates that could re-identify, or distinguishing facts. The past-results disclaimer renders automatically in proximity."
      />

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
