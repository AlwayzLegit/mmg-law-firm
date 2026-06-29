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

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 backdrop-blur">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runBulk(true)}
              disabled={pending}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runBulk(false)}
              disabled={pending}
              className="gap-1.5"
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              Unpublish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={runReview}
              disabled={pending}
              className="gap-1.5"
            >
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              Mark reviewed
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-3 text-left">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  aria-label={allChecked ? "Deselect all" : "Select all"}
                />
              </th>
              <th className="px-2 py-3 text-left">Page</th>
              <th className="px-2 py-3 text-left">Local angle</th>
              <th className="px-2 py-3 text-left">Status</th>
              <th className="px-2 py-3 text-left">Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-border/60 ${selected.has(r.id) ? "bg-primary/5" : ""}`}
              >
                <td className="px-2 py-3 align-top">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(v) => toggleRow(r.id, v === true)}
                    aria-label={`Select ${r.title}`}
                  />
                </td>
                <td className="px-2 py-3 align-top">
                  <Link
                    href={r.href}
                    className="font-medium hover:text-primary"
                  >
                    {r.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{r.path}</p>
                </td>
                <td className="px-2 py-3 align-top">
                  {r.hasAngle ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Empty
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 align-top">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      r.isPublished
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {r.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-2 py-3 align-top text-xs">
                  {r.lastReviewed ? (
                    <span
                      className={
                        r.isStale ? "text-warning" : "text-muted-foreground"
                      }
                    >
                      {r.isStale ? (
                        <AlertTriangle
                          className="mr-1 inline h-3 w-3"
                          aria-hidden
                        />
                      ) : null}
                      {new Date(r.lastReviewed).toLocaleDateString("en-US")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
