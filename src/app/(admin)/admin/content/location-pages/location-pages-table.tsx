"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { TonePill } from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import {
  bulkSetLocationPagePublished,
  bulkTouchReviewed,
} from "./actions";

export type LpRow = {
  id: string;
  href: string;
  title: string;
  path: string;
  hasAngle: boolean;
  isPublished: boolean;
  lastReviewed: string | null;
  isStale: boolean;
};

const COLS = "md:grid-cols-[28px_minmax(0,2fr)_110px_110px_130px]";
const BULK_BTN =
  "border-cream/25 hover:border-cream text-cream inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-xs font-semibold transition-colors disabled:opacity-50";

export default function LocationPagesTable({ rows }: { rows: LpRow[] }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();

  const allChecked = rows.length > 0 && selected.size === rows.length;

  function toggleRow(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(on: boolean) {
    setSelected(on ? new Set(rows.map((r) => r.id)) : new Set());
  }

  function runBulk(publish: boolean) {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    fd.set("is_published", String(publish));
    startTransition(async () => {
      const result = await bulkSetLocationPagePublished(fd);
      if (result.ok) {
        toast.success(
          `${publish ? "Published" : "Unpublished"} ${result.updated} page${result.updated === 1 ? "" : "s"}` +
            (result.skipped > 0
              ? ` · ${result.skipped} skipped (no local angle)`
              : ""),
        );
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  function runReview() {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    startTransition(async () => {
      const result = await bulkTouchReviewed(fd);
      if (result.ok) {
        toast.success(
          `Marked ${result.updated} page${result.updated === 1 ? "" : "s"} reviewed.`,
        );
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="grid gap-3">
      {selected.size > 0 ? (
        <div className="surface-ink bg-ink text-cream sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-[12px] px-4 py-2.5">
          <span className="text-[13px] font-semibold">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => runBulk(true)} disabled={pending} className={BULK_BTN}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Publish
            </button>
            <button type="button" onClick={() => runBulk(false)} disabled={pending} className={BULK_BTN}>
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              Unpublish
            </button>
            <button type="button" onClick={runReview} disabled={pending} className={BULK_BTN}>
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              className="text-cream/70 hover:text-cream inline-flex h-8 items-center gap-1.5 px-2 text-xs font-semibold"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="-mx-4">
        <div className={cn("micro-label text-stone border-line hidden items-center gap-3 border-b px-4 pb-2.5 md:grid", COLS)}>
          <span>
            <Checkbox
              checked={allChecked}
              onCheckedChange={(v) => toggleAll(v === true)}
              aria-label={allChecked ? "Deselect all" : "Select all"}
            />
          </span>
          <span>Page</span>
          <span>Local angle</span>
          <span>Status</span>
          <span>Last reviewed</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className={cn(
              "border-line grid items-center gap-x-3 gap-y-1.5 border-b px-4 py-3 text-[13px] last:border-b-0 md:gap-3",
              COLS,
              selected.has(r.id) && "bg-gold/8",
            )}
          >
            <span>
              <Checkbox
                checked={selected.has(r.id)}
                onCheckedChange={(v) => toggleRow(r.id, v === true)}
                aria-label={`Select ${r.title}`}
              />
            </span>
            <span className="min-w-0">
              <Link href={r.href} className="text-foreground hover:text-gold-deep block truncate font-semibold no-underline">
                {r.title}
              </Link>
              <span className="text-stone block truncate font-mono text-[11px]">{r.path}</span>
            </span>
            <span>
              {r.hasAngle ? (
                <TonePill tone="good">
                  <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                  Set
                </TonePill>
              ) : (
                <TonePill tone="warn">
                  <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                  Empty
                </TonePill>
              )}
            </span>
            <span>
              <TonePill tone={r.isPublished ? "ink" : "muted"}>{r.isPublished ? "Published" : "Draft"}</TonePill>
            </span>
            <span className="text-xs">
              {r.lastReviewed ? (
                <span className={r.isStale ? "text-gold-deep font-semibold" : "text-stone"}>
                  {r.isStale ? <AlertTriangle className="mr-1 inline h-3 w-3" aria-hidden /> : null}
                  {new Date(r.lastReviewed).toLocaleDateString("en-US")}
                </span>
              ) : (
                <span className="text-stone">Never</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
