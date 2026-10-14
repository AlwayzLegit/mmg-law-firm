"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusPill } from "@/components/admin/agent-status-pill";
import { Button } from "@/components/ui/button";

import { deleteTopic, updateTopic } from "./actions";

export type TopicRowData = {
  id: string;
  keyword: string;
  intent: string;
  status: string;
  priority: number;
  target_url: string | null;
  notes: string | null;
  volume: number | null;
  kd: number | null;
  cpc: number | string | null;
  source: string;
  post_id: string | null;
  practice_area: string | null;
  place: string | null;
  updated_at: string;
};

const STATUSES = ["queued", "claimed", "drafted", "published", "skipped", "rejected"];
const selectCls =
  "h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export default function TopicRow({ t }: { t: TopicRowData }) {
  const [pending, startTransition] = React.useTransition();
  const [priority, setPriority] = React.useState(String(t.priority));
  const [status, setStatus] = React.useState(t.status);
  const [notes, setNotes] = React.useState(t.notes ?? "");
  const [editing, setEditing] = React.useState(false);

  function save(patch: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", t.id);
    for (const [k, v] of Object.entries(patch)) fd.set(k, v);
    startTransition(async () => {
      const r = await updateTopic(fd);
      if (r.ok) toast.success("Saved.");
      else toast.error(r.error);
    });
  }

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.keyword}</p>
          <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-xs">
            <span>{t.intent.replace(/_/g, " ")}</span>
            {t.practice_area ? <span>· {t.practice_area}</span> : null}
            {t.place ? <span>· {t.place}</span> : null}
            {t.volume != null ? <span>· vol {t.volume.toLocaleString("en-US")}</span> : null}
            {t.kd != null ? <span>· KD {t.kd}</span> : null}
            {t.cpc != null ? <span>· ${Number(t.cpc).toFixed(0)}</span> : null}
            <span>· {t.source}</span>
          </p>
          {t.target_url ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              → <Link href={t.target_url} target="_blank" className="hover:text-primary underline-offset-4 hover:underline">{t.target_url}</Link>
            </p>
          ) : null}
          {t.post_id ? (
            <p className="mt-0.5 text-xs">
              <Link href={`/admin/content/blog/${t.post_id}`} className="text-primary hover:underline">Open post →</Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-none items-center gap-2">
          <label className="sr-only" htmlFor={`prio-${t.id}`}>Priority</label>
          <input
            id={`prio-${t.id}`}
            type="number"
            min={0}
            max={1000}
            value={priority}
            onChange={(e) => setPriority(e.currentTarget.value)}
            onBlur={() => { if (priority !== String(t.priority)) save({ priority }); }}
            className={`${selectCls} w-16 text-right tabular-nums`}
            title="Priority — lower runs sooner"
          />
          <label className="sr-only" htmlFor={`status-${t.id}`}>Status</label>
          <select
            id={`status-${t.id}`}
            value={status}
            onChange={(e) => { setStatus(e.currentTarget.value); save({ status: e.currentTarget.value }); }}
            className={selectCls}
            disabled={pending}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <StatusPill kind="topic" value={t.status} />
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} className="text-xs">
            {editing ? "Close" : "Notes"}
          </Button>
          {!t.post_id ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete topic"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Delete “${t.keyword}”?`)) return;
                const fd = new FormData();
                fd.set("id", t.id);
                startTransition(async () => {
                  const r = await deleteTopic(fd);
                  if (!r.ok) toast.error(r.error);
                });
              }}
            >
              <Trash2 className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="mt-2 grid gap-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={3}
            maxLength={2000}
            placeholder="Notes for the agent: angle, what to avoid, facts to cite…"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-xs"
          />
          <div>
            <Button type="button" size="sm" disabled={pending} onClick={() => save({ notes })}>Save notes</Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
