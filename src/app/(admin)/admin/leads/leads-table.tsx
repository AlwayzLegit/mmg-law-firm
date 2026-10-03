"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck, MailCheck, ShieldOff, Tag, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { LeadStatusPill } from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { bulkAssignToMe, bulkTag, bulkUpdateStatus } from "./actions";

export type LeadRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
  follow_up_at?: string | null;
  tags?: string[] | null;
};

/**
 * Response-SLA badge for a row. A still-"new" lead hasn't had a first staff
 * touch (the workflow moves it off "new" on first contact), so its age since
 * submission is the response clock. Older = more urgent.
 */
function slaBadge(status: string, createdAt: string, now: number): { label: string; cls: string } | null {
  if (status !== "new") return null;
  const ageHours = (now - new Date(createdAt).getTime()) / 3_600_000;
  if (ageHours >= 24) return { label: "24h+ no reply", cls: "bg-[rgba(220,38,38,.1)] text-[#b91c1c]" };
  if (ageHours >= 1) return { label: "1h+ no reply", cls: "bg-gold/18 text-gold-deep" };
  return null;
}

function relative(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const h = Math.round(m / 60);
  const d = Math.round(h / 24);
  const s = m < 60 ? `${Math.max(1, m)}m` : h < 24 ? `${h}h` : `${d}d`;
  return diff >= 0 ? `${s} ago` : `in ${s}`;
}

function followUpLabel(iso: string | null | undefined, now: number): { text: string; cls: string } {
  if (!iso) return { text: "—", cls: "text-stone" };
  const t = new Date(iso).getTime();
  if (t < now) return { text: `Overdue ${relative(iso, now).replace(" ago", "")}`, cls: "text-[#b91c1c] font-semibold" };
  return { text: `Due ${relative(iso, now)}`, cls: "text-gold-deep font-semibold" };
}

const PILL_BTN =
  "border-cream/20 text-cream hover:border-cream inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50";

type Props = {
  rows: LeadRow[];
  status: string;
  tagSuggestions?: string[];
  /** Current list filters as a querystring, threaded to detail for prev/next. */
  fromQuery?: string;
  /** Rendered in the table footer (count, pagination). */
  footer?: React.ReactNode;
};

const GRID = "grid grid-cols-[36px_minmax(160px,1.4fr)_minmax(140px,1fr)_110px_120px_90px] gap-3";

export default function LeadsTable({ rows, status, tagSuggestions = [], fromQuery = "", footer }: Props) {
  const detailHref = (id: string) => `/admin/leads/${id}${fromQuery ? `?from=${encodeURIComponent(fromQuery)}` : ""}`;
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  const [tagInput, setTagInput] = React.useState("");
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

  function runBulk(action: "status" | "assign", statusValue?: string) {
    if (selected.size === 0) return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    if (action === "status" && statusValue) fd.set("status", statusValue);

    startTransition(async () => {
      const result = action === "status" ? await bulkUpdateStatus(fd) : await bulkAssignToMe(fd);
      if (result.ok) {
        toast.success(`Updated ${result.updated} lead${result.updated === 1 ? "" : "s"}.`);
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  function runBulkTag(op: "add" | "remove") {
    const tag = tagInput.trim().toLowerCase();
    if (selected.size === 0 || tag === "") return;
    const fd = new FormData();
    for (const id of selected) fd.append("ids", id);
    fd.set("tag", tag);
    fd.set("op", op);

    startTransition(async () => {
      const result = await bulkTag(fd);
      if (result.ok) {
        toast.success(`${op === "add" ? "Tagged" : "Untagged"} ${result.updated} lead${result.updated === 1 ? "" : "s"} “${tag}”.`);
        setTagInput("");
        setSelected(new Set());
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card ring-ink/8 rounded-[14px] p-10 text-center ring-1">
        <p className="text-stone text-sm">No leads found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3.5">
      {selected.size > 0 ? (
        <div className="surface-ink bg-background text-foreground sticky top-2 z-10 flex flex-wrap items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[13px]">
          <strong className="text-cream">{selected.size} selected</strong>
          <span className="text-cream/50">·</span>
          {status === "spam" ? (
            <button type="button" onClick={() => runBulk("status", "new")} disabled={pending} className={PILL_BTN}>
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Not spam
            </button>
          ) : (
            <>
              <button type="button" onClick={() => runBulk("status", "contacted")} disabled={pending} className={PILL_BTN}>
                <MailCheck className="h-3.5 w-3.5" aria-hidden />
                Mark contacted
              </button>
              <button type="button" onClick={() => runBulk("assign")} disabled={pending} className={PILL_BTN}>
                <UserCheck className="h-3.5 w-3.5" aria-hidden />
                Assign to me
              </button>
              <button type="button" onClick={() => runBulk("status", "spam")} disabled={pending} className={PILL_BTN}>
                <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                Mark spam
              </button>
              <span className="inline-flex items-center gap-1.5">
                <Tag className="text-cream/60 h-3.5 w-3.5" aria-hidden />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runBulkTag("add");
                    }
                  }}
                  placeholder="tag…"
                  aria-label="Tag to add or remove"
                  maxLength={30}
                  list="bulk-tag-suggest"
                  className="border-cream/20 text-cream placeholder:text-cream/40 h-[30px] w-28 rounded-full border bg-transparent px-3 text-xs outline-none focus:border-gold"
                />
                <datalist id="bulk-tag-suggest">
                  {tagSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <button type="button" onClick={() => runBulkTag("add")} disabled={pending || tagInput.trim() === ""} className={PILL_BTN}>
                  Tag
                </button>
                <button type="button" onClick={() => runBulkTag("remove")} disabled={pending || tagInput.trim() === ""} className={PILL_BTN}>
                  Untag
                </button>
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={pending}
            aria-label="Clear selection"
            className="text-cream/60 hover:text-cream ml-auto inline-flex items-center gap-1 text-xs"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        </div>
      ) : null}

      <div className="bg-card ring-ink/8 overflow-x-auto rounded-[14px] ring-1">
        <div className={cn(GRID, "border-ink/8 micro-label text-stone min-w-[720px] items-center border-b px-4 py-2.5")}>
          <span>
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
          </span>
          <span>Lead</span>
          <span>Contact</span>
          <span>Status</span>
          <span>Follow-up</span>
          <span>Received</span>
        </div>
        {rows.map((l) => {
          const sla = slaBadge(l.status, l.created_at, now);
          const fu = followUpLabel(l.follow_up_at, now);
          return (
            <div
              key={l.id}
              className={cn(
                GRID,
                "border-ink/6 min-w-[720px] items-center border-b px-4 py-3 text-sm last:border-b-0 hover:bg-[#faf8f3]",
                selected.has(l.id) && "bg-gold/8",
              )}
            >
              <Checkbox checked={selected.has(l.id)} onCheckedChange={(v) => toggleRow(l.id, v === true)} aria-label={`Select ${l.full_name}`} />
              <div className="min-w-0">
                <Link href={detailHref(l.id)} className="text-foreground hover:text-gold-deep block truncate font-semibold no-underline">
                  {l.full_name}
                </Link>
                {l.tags && l.tags.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {l.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/admin/leads?tag=${encodeURIComponent(t)}`}
                        className="bg-gold/16 text-gold-deep rounded-full px-1.5 py-0.5 text-[10px] font-semibold no-underline"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0">
                <span className="block truncate">{l.phone}</span>
                <span className="text-stone block truncate text-xs">{l.email ?? "—"}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <LeadStatusPill status={l.status} />
                {sla ? (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", sla.cls)} title="Awaiting first response">
                    {sla.label}
                  </span>
                ) : null}
              </div>
              <span className={cn("text-[12.5px]", fu.cls)}>
                {l.follow_up_at ? <time dateTime={l.follow_up_at}>{fu.text}</time> : fu.text}
              </span>
              <time dateTime={l.created_at} className="text-stone text-xs" title={new Date(l.created_at).toLocaleString("en-US")}>
                {relative(l.created_at, now)}
              </time>
            </div>
          );
        })}
        {footer ? <div className="text-stone flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">{footer}</div> : null}
      </div>
    </div>
  );
}
