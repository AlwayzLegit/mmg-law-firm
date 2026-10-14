"use client";

import * as React from "react";
import { Sprout, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createTopic, importTopics, seedDefaultTopics } from "./actions";

const INTENTS = ["informational", "supporting_post", "local", "faq", "news", "comparison"];
const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function NewTopicForm({ practiceAreas }: { practiceAreas: Array<{ slug: string; name: string }> }) {
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await createTopic(fd);
          if (r.ok) { toast.success("Topic added."); ref.current?.reset(); }
          else toast.error(r.error);
        });
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Input name="keyword" required minLength={2} maxLength={160} placeholder="Keyword, e.g. neck injury lawyer" className="h-9 text-sm sm:col-span-2" />
      <select name="intent" defaultValue="informational" className={selectCls} aria-label="Intent">
        {INTENTS.map((i) => <option key={i} value={i}>{i.replace(/_/g, " ")}</option>)}
      </select>
      <select name="practice_area_slug" defaultValue="" className={selectCls} aria-label="Practice area">
        <option value="">Practice area (optional)</option>
        {practiceAreas.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
      </select>
      <Input name="target_url" placeholder="Money page to link to, e.g. /locations/…/glendale/car-accidents" pattern="^/.*" className="h-9 text-sm sm:col-span-2" />
      <Input name="city_slug" placeholder="city slug (optional)" className="h-9 text-sm" />
      <Input name="priority" type="number" min={0} max={1000} placeholder="Priority (50)" className="h-9 text-sm" />
      <Input name="notes" placeholder="Notes for the agent (angle, facts, what to avoid)" className="h-9 text-sm sm:col-span-2" />
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add topic"}</Button>
      </div>
    </form>
  );
}

export function ImportForm() {
  const [pending, startTransition] = React.useTransition();
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await importTopics(fd);
          if (r.ok) { toast.success(r.message ?? "Imported."); ref.current?.reset(); }
          else toast.error(r.error);
        });
      }}
      className="grid gap-2"
    >
      <textarea
        name="text"
        rows={6}
        placeholder={"Paste a markdown table (| Keyword | Vol | KD | CPC | Practice area | Build as |) or CSV with a header row: keyword, intent, practice_area, county, city, target_url, priority, volume, kd, cpc, notes"}
        className="border-input bg-background w-full rounded-md border px-3 py-2 font-mono text-xs"
      />
      <label className="text-muted-foreground flex items-center gap-2 text-xs">
        <input type="checkbox" name="upsert" className="size-3.5" /> Update existing queued topics with the same keyword
      </label>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" aria-hidden /> {pending ? "Importing…" : "Import"}
        </Button>
      </div>
    </form>
  );
}

export function SeedButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-1.5"
      onClick={() =>
        startTransition(async () => {
          const r = await seedDefaultTopics();
          if (r.ok) toast.success(r.message ?? "Seeded.");
          else toast.error(r.error);
        })
      }
    >
      <Sprout className="h-3.5 w-3.5" aria-hidden /> {pending ? "Seeding…" : "Seed defaults"}
    </Button>
  );
}
