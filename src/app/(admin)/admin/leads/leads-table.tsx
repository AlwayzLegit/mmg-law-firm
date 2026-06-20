"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck, MailCheck, ShieldOff, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { bulkAssignToMe, bulkUpdateStatus } from "./actions";

export type LeadRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
  follow_up_at?: string | null;
};

type Props = {
  rows: LeadRow[];
  status: string;
};

export default function LeadsTable({ rows, status }: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  // Captured once so render stays pure (no Date.now() during render).
  const [now] = React.useState(() => Date.now());

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleRow(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    if (on) setSelected(new Set(rows.map((r) => r.id)));
    else setSelected(new Set());
  }

  function runBulk(
    action: "status" | "assign",
    statusValue?: string,
  ) {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    if (action === "status" && statusValue) fd.set("status", statusValue);

    startTransition(async () => {
      const result =
        action === "status"
          ? await bulkUpdateStatus(fd)
          : await bulkAssignToMe(fd);
      if (result.ok) {
        toast.success(`Updated ${result.updated} lead${result.updated === 1 ? "" : "s"}.`);
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No leads found.</p>;
  }

  return (
    <div className="grid gap-3">
      {selected.size > 0 ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 backdrop-blur">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {status === "spam" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => runBulk("status", "new")}
                disabled={pending}
                className="gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Not spam
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runBulk("status", "contacted")}
                  disabled={pending}
                  className="gap-1.5"
                >
                  <MailCheck className="h-3.5 w-3.5" aria-hidden />
                  Mark contacted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runBulk("assign")}
                  disabled={pending}
                  className="gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" aria-hidden />
                  Assign to me
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runBulk("status", "spam")}
                  disabled={pending}
                  className="gap-1.5"
                >
                  <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                  Mark spam
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={pending}
              aria-label="Clear selection"
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
                  // base-nova Checkbox doesn't accept "indeterminate" — when
                  // some-but-not-all are checked, show unchecked; clicking
                  // it selects all.
                  checked={allChecked}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  aria-label={
                    allChecked
                      ? "Deselect all"
                      : someChecked
                        ? `Select all (${rows.length}); ${rows.length - selected.size} not yet selected`
                        : "Select all"
                  }
                />
              </th>
              <th className="px-2 py-3 text-left">Created</th>
              <th className="px-2 py-3 text-left">Name</th>
              <th className="px-2 py-3 text-left">Phone</th>
              <th className="px-2 py-3 text-left">Email</th>
              <th className="px-2 py-3 text-left">Status</th>
              <th className="px-2 py-3 text-left">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr
                key={l.id}
                className={`border-b border-border/60 ${
                  selected.has(l.id) ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-2 py-3 align-top">
                  <Checkbox
                    checked={selected.has(l.id)}
                    onCheckedChange={(v) => toggleRow(l.id, v === true)}
                    aria-label={`Select ${l.full_name}`}
                  />
                </td>
                <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                  <time dateTime={l.created_at}>
                    {new Date(l.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </td>
                <td className="px-2 py-3 align-top">
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {l.full_name}
                  </Link>
                </td>
                <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                  {l.phone}
                </td>
                <td className="px-2 py-3 align-top text-xs text-muted-foreground">
                  {l.email ?? "—"}
                </td>
                <td className="px-2 py-3 align-top">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${
                      l.status === "signed"
                        ? "bg-success/10 text-success"
                        : l.status === "spam" || l.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary"
                    }`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-2 py-3 align-top text-xs">
                  {l.follow_up_at ? (
                    <time
                      dateTime={l.follow_up_at}
                      className={
                        new Date(l.follow_up_at).getTime() < now
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {new Date(l.follow_up_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
