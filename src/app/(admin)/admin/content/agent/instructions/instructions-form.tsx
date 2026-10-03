"use client";

import * as React from "react";
import { toast } from "sonner";

import MarkdownEditField from "@/components/admin/markdown-edit-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AgentSettings } from "@/lib/content-agent/settings";

import { publishInstructions } from "./actions";

type Props = { version: number | null; body_md: string; settings: AgentSettings };

const inputCls = "h-9 text-sm";
const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export default function InstructionsForm({ version, body_md, settings }: Props) {
  const [body, setBody] = React.useState(body_md);
  const [s, setS] = React.useState<AgentSettings>(settings);
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const dirty = body !== body_md || JSON.stringify(s) !== JSON.stringify(settings);

  function set<K extends keyof AgentSettings>(k: K, v: AgentSettings[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }
  function list(v: string): string[] {
    return v.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("body_md", body);
    fd.set("change_note", note);
    fd.set("settings_json", JSON.stringify(s));
    startTransition(async () => {
      const r = await publishInstructions(fd);
      if (r.ok) {
        toast.success(`Published version ${r.version}. The next run uses it.`);
        setNote("");
      } else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <MarkdownEditField
          name="body_md"
          title="Standing instructions (markdown)"
          hint="The agent reads this verbatim every run. Compliance rules, voice, structure, workflow."
          value={body}
          onChange={setBody}
          minRows={24}
          maxLength={32000}
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Field label="Cadence">
              <select value={s.cadence} onChange={(e) => set("cadence", e.currentTarget.value as AgentSettings["cadence"])} className={selectCls}>
                <option value="daily">daily</option>
                <option value="weekdays">weekdays</option>
                <option value="weekly">weekly</option>
              </select>
            </Field>
            <Field label="Posts per run">
              <Input type="number" min={0} max={5} value={s.posts_per_run} onChange={(e) => set("posts_per_run", Number(e.currentTarget.value))} className={inputCls} />
            </Field>
            <Field label="Pause when drafts awaiting review exceed">
              <Input type="number" min={0} max={50} value={s.max_review_backlog} onChange={(e) => set("max_review_backlog", Number(e.currentTarget.value))} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min words">
                <Input type="number" min={300} max={5000} value={s.min_words} onChange={(e) => set("min_words", Number(e.currentTarget.value))} className={inputCls} />
              </Field>
              <Field label="Max words">
                <Input type="number" min={300} max={6000} value={s.max_words} onChange={(e) => set("max_words", Number(e.currentTarget.value))} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Internal links min">
                <Input type="number" min={0} max={20} value={s.internal_links.min} onChange={(e) => set("internal_links", { ...s.internal_links, min: Number(e.currentTarget.value) })} className={inputCls} />
              </Field>
              <Field label="Internal links max">
                <Input type="number" min={0} max={30} value={s.internal_links.max} onChange={(e) => set("internal_links", { ...s.internal_links, max: Number(e.currentTarget.value) })} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 size-3.5" checked={s.internal_links.must_link_target_url} onChange={(e) => set("internal_links", { ...s.internal_links, must_link_target_url: e.currentTarget.checked })} />
              <span>Every post must link to its topic&apos;s money page (<code className="text-xs">target_url</code>)</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 size-3.5" checked={s.internal_links.avoid_cannibalization} onChange={(e) => set("internal_links", { ...s.internal_links, avoid_cannibalization: e.currentTarget.checked })} />
              <span>Never target a city × practice page&apos;s keyword as a post&apos;s primary keyword</span>
            </label>
            <Field label="Hero image">
              <select value={s.hero_image} onChange={(e) => set("hero_image", e.currentTarget.value as AgentSettings["hero_image"])} className={selectCls}>
                <option value="none">none</option>
                <option value="optional">optional</option>
                <option value="required">required</option>
              </select>
            </Field>
            <Field label="Tone">
              <Input value={s.tone} onChange={(e) => set("tone", e.currentTarget.value)} className={inputCls} maxLength={500} />
            </Field>
            <Field label="Audience">
              <Input value={s.audience} onChange={(e) => set("audience", e.currentTarget.value)} className={inputCls} maxLength={500} />
            </Field>
            <Field label="Required sections (comma or newline separated)">
              <textarea rows={2} value={s.required_sections.join(", ")} onChange={(e) => set("required_sections", list(e.currentTarget.value))} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" />
            </Field>
            <Field label="Banned phrases">
              <textarea rows={3} value={s.banned_phrases.join(", ")} onChange={(e) => set("banned_phrases", list(e.currentTarget.value))} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" />
            </Field>
            <Field label="Run timeout (minutes)">
              <Input type="number" min={15} max={720} value={s.run_timeout_minutes} onChange={(e) => set("run_timeout_minutes", Number(e.currentTarget.value))} className={inputCls} />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="text-base">Publishing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 size-3.5" checked={s.auto_publish} onChange={(e) => set("auto_publish", e.currentTarget.checked)} />
              <span>
                <strong>Allow the agent to publish</strong> (its key also needs the <code className="text-xs">blog:publish</code> scope).
                Off = every post is a draft you review first. Recommended off until you trust the output.
              </span>
            </label>
            <Field label="Email me when…">
              <div className="grid gap-1">
                {(["questions", "failure", "needs_human", "every_run"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-3.5"
                      checked={s.notify_on.includes(k)}
                      onChange={(e) =>
                        set("notify_on", e.currentTarget.checked ? [...s.notify_on, k] : s.notify_on.filter((x) => x !== k))
                      }
                    />
                    {k.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish new version</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-muted-foreground text-xs">
              {version ? `Current: v${version}. ` : "No version yet. "}
              Publishing creates v{(version ?? 0) + 1}; runs already in progress keep the version they started with.
            </p>
            <Input value={note} onChange={(e) => setNote(e.currentTarget.value)} placeholder="Change note (optional)" className={inputCls} maxLength={300} />
            <Button type="submit" disabled={pending || !dirty}>
              {pending ? "Publishing…" : dirty ? "Publish new version" : "No changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">{label}</span>
      {children}
    </label>
  );
}
