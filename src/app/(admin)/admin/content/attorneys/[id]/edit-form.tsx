"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { updateAttorneyProfile } from "../actions";

type Props = {
  id: string;
  slug: string;
  full_name: string;
  display_name: string;
  job_title: string;
  bar_state: string;
  bar_number: string;
  bar_admission_date: string;
  headshot_url: string;
  headshot_alt: string;
  short_bio: string;
  bio_md: string;
  law_school: string;
  law_school_year: string;
  undergrad_school: string;
  undergrad_degree: string;
  undergrad_year: string;
  federal_court_admissions: string;
  bar_associations: string;
  honors_md: string;
  languages: string;
  avvo_url: string;
  justia_url: string;
  linkedin_url: string;
  super_lawyers_url: string;
  display_order: string;
};

export default function EditForm(props: Props) {
  const [state, setState] = React.useState(props);
  const [pending, startTransition] = React.useTransition();

  const dirty = (Object.keys(props) as Array<keyof Props>).some(
    (k) => state[k] !== props[k],
  );

  function set<K extends keyof Props>(key: K, value: Props[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateAttorneyProfile(fd);
      if (result.ok) toast.success("Profile saved.");
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
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Full name">
            <Input
              name="full_name"
              required
              minLength={2}
              maxLength={160}
              value={state.full_name}
              onChange={(e) => set("full_name", e.currentTarget.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Display name"
              hint="Casual first-name reference, e.g. used in “Meet Mihran.”"
            >
              <Input
                name="display_name"
                maxLength={60}
                value={state.display_name}
                onChange={(e) => set("display_name", e.currentTarget.value)}
              />
            </Field>
            <Field label="Job title">
              <Input
                name="job_title"
                maxLength={120}
                value={state.job_title}
                onChange={(e) => set("job_title", e.currentTarget.value)}
                placeholder="Founder & Lead Attorney"
              />
            </Field>
          </div>
          <Field
            label="URL slug"
            hint="Lowercase letters, numbers, hyphens. URL: /attorneys/{slug}"
          >
            <Input
              name="slug"
              required
              pattern="^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$"
              minLength={2}
              maxLength={80}
              value={state.slug}
              onChange={(e) => set("slug", e.currentTarget.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bar admission</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bar state">
              <Input
                name="bar_state"
                required
                minLength={2}
                maxLength={60}
                value={state.bar_state}
                onChange={(e) => set("bar_state", e.currentTarget.value)}
              />
            </Field>
            <Field label="Bar number">
              <Input
                name="bar_number"
                required
                maxLength={40}
                value={state.bar_number}
                onChange={(e) => set("bar_number", e.currentTarget.value)}
              />
            </Field>
          </div>
          <Field
            label="Bar admission date"
            hint="YYYY-MM-DD. Surfaced in JSON-LD and the bio page."
          >
            <Input
              name="bar_admission_date"
              type="date"
              value={state.bar_admission_date}
              onChange={(e) => set("bar_admission_date", e.currentTarget.value)}
            />
          </Field>
          <Field
            label="Federal court admissions"
            hint="One per line. Example: U.S. District Court, Central District of California"
          >
            <TextareaAutosize
              name="federal_court_admissions"
              minRows={2}
              value={state.federal_court_admissions}
              onChange={(e) =>
                set("federal_court_admissions", e.currentTarget.value)
              }
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bio copy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Short bio"
            hint="1–2 sentences. Used on the homepage attorney card."
          >
            <TextareaAutosize
              name="short_bio"
              minRows={2}
              maxLength={400}
              value={state.short_bio}
              onChange={(e) => set("short_bio", e.currentTarget.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="bio_md"
        title="Long-form bio"
        value={state.bio_md}
        onChange={(v) => set("bio_md", v)}
        minRows={10}
        maxLength={20000}
        placeholder={
          "The full attorney bio. Markdown supported. Use H2 (##) for section breaks (Why this practice, Approach, etc.)."
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Law school">
              <Input
                name="law_school"
                maxLength={160}
                value={state.law_school}
                onChange={(e) => set("law_school", e.currentTarget.value)}
              />
            </Field>
            <Field label="JD year">
              <Input
                name="law_school_year"
                type="number"
                min={1900}
                max={2099}
                value={state.law_school_year}
                onChange={(e) => set("law_school_year", e.currentTarget.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
            <Field label="Undergrad school">
              <Input
                name="undergrad_school"
                maxLength={160}
                value={state.undergrad_school}
                onChange={(e) => set("undergrad_school", e.currentTarget.value)}
              />
            </Field>
            <Field label="Undergrad degree">
              <Input
                name="undergrad_degree"
                maxLength={160}
                value={state.undergrad_degree}
                onChange={(e) => set("undergrad_degree", e.currentTarget.value)}
                placeholder="B.A., Political Science"
              />
            </Field>
            <Field label="Year">
              <Input
                name="undergrad_year"
                type="number"
                min={1900}
                max={2099}
                value={state.undergrad_year}
                onChange={(e) => set("undergrad_year", e.currentTarget.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Languages"
            hint="Comma-separated. Drives the “Counsel in …” line and the knowsLanguage JSON-LD."
          >
            <Input
              name="languages"
              maxLength={220}
              value={state.languages}
              onChange={(e) => set("languages", e.currentTarget.value)}
              placeholder="English, Armenian, Russian"
            />
          </Field>
          <Field
            label="Bar associations"
            hint="One per line. Example: CAALA — Consumer Attorneys Association of Los Angeles"
          >
            <TextareaAutosize
              name="bar_associations"
              minRows={2}
              value={state.bar_associations}
              onChange={(e) => set("bar_associations", e.currentTarget.value)}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      <MarkdownEditField
        name="honors_md"
        title="Honors & recognition"
        value={state.honors_md}
        onChange={(v) => set("honors_md", v)}
        minRows={4}
        maxLength={8000}
        placeholder="Free-form. Markdown supported. Awards, Super Lawyers years, pro bono service. Do not list anything you cannot substantiate."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Headshot caption</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Headshot URL"
            hint="Set automatically when you upload via the panel on the right. You can override with any allow-listed URL."
          >
            <Input
              name="headshot_url"
              type="url"
              value={state.headshot_url}
              onChange={(e) => set("headshot_url", e.currentTarget.value)}
              placeholder="https://your-project.supabase.co/storage/v1/object/public/attorney-headshots/..."
            />
          </Field>
          <Field
            label="Headshot alt text"
            hint={`Descriptive, screen-reader friendly. Falls back to the attorney's full name.`}
          >
            <Input
              name="headshot_alt"
              maxLength={220}
              value={state.headshot_alt}
              onChange={(e) => set("headshot_alt", e.currentTarget.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">External profiles (sameAs)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Avvo URL">
            <Input
              name="avvo_url"
              type="url"
              value={state.avvo_url}
              onChange={(e) => set("avvo_url", e.currentTarget.value)}
            />
          </Field>
          <Field label="Justia URL">
            <Input
              name="justia_url"
              type="url"
              value={state.justia_url}
              onChange={(e) => set("justia_url", e.currentTarget.value)}
            />
          </Field>
          <Field label="LinkedIn URL">
            <Input
              name="linkedin_url"
              type="url"
              value={state.linkedin_url}
              onChange={(e) => set("linkedin_url", e.currentTarget.value)}
            />
          </Field>
          <Field label="Super Lawyers URL">
            <Input
              name="super_lawyers_url"
              type="url"
              value={state.super_lawyers_url}
              onChange={(e) => set("super_lawyers_url", e.currentTarget.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display order</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Order"
            hint="Lower numbers come first when listing multiple attorneys. Default 100."
          >
            <Input
              name="display_order"
              type="number"
              min={0}
              max={9999}
              value={state.display_order}
              onChange={(e) => set("display_order", e.currentTarget.value)}
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
