"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { normalizeTags } from "@/lib/leads/tags";

import { bulkTag, moveLeadStatus } from "../actions";

export type KanbanCard = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  follow_up_at: string | null;
  assigned_to: string | null;
  tags: string[] | null;
};

/** Initials for an assignee chip, e.g. "Mihran Ghazaryan" → "MG". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const COLUMNS = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "signed", label: "Signed" },
  { key: "rejected", label: "Rejected" },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

function groupByStatus(cards: KanbanCard[]): Record<ColKey, KanbanCard[]> {
  const out: Record<ColKey, KanbanCard[]> = {
    new: [],
    contacted: [],
    qualified: [],
    signed: [],
    rejected: [],
  };
  for (const c of cards) {
    if (c.status in out) out[c.status as ColKey].push(c);
  }
  return out;
}

export default function KanbanBoard({
  cards,
  assigneeNames,
  tagSuggestions = [],
}: {
  cards: KanbanCard[];
  assigneeNames: Record<string, string>;
  tagSuggestions?: string[];
}) {
  const router = useRouter();
  const [cols, setCols] = React.useState(() => groupByStatus(cards));
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<ColKey | null>(null);
  const [tagOpen, setTagOpen] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState("");
  const [, startTransition] = React.useTransition();
  const [now] = React.useState(() => Date.now());

  // Re-sync when the server sends fresh data (e.g. after revalidation or an
  // external change). Adjusting state during render — rather than in an
  // effect — is React's recommended pattern for derived-from-prop state.
  const [prevCards, setPrevCards] = React.useState(cards);
  if (cards !== prevCards) {
    setPrevCards(cards);
    setCols(groupByStatus(cards));
  }

  function move(id: string, to: ColKey) {
    let from: ColKey | null = null;
    let card: KanbanCard | undefined;
    for (const col of COLUMNS) {
      const hit = cols[col.key].find((c) => c.id === id);
      if (hit) {
        from = col.key;
        card = hit;
        break;
      }
    }
    if (!from || !card || from === to) return;

    const prev = cols;
    const moved: KanbanCard = { ...card, status: to };
    setCols((c) => ({
      ...c,
      [from!]: c[from!].filter((x) => x.id !== id),
      [to]: [moved, ...c[to]],
    }));

    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", to);
    startTransition(async () => {
      const res = await moveLeadStatus(fd);
      if (res.ok) {
        toast.success(
          `Moved ${card!.full_name} to ${COLUMNS.find((c) => c.key === to)?.label}.`,
        );
        router.refresh();
      } else {
        setCols(prev); // revert
        toast.error(res.error);
      }
    });
  }

  /** Update one card's tags within the grouped columns, immutably. */
  function patchCardTags(id: string, tags: string[]) {
    setCols((c) => {
      const next = {} as Record<ColKey, KanbanCard[]>;
      for (const col of COLUMNS) {
        next[col.key] = c[col.key].map((x) =>
          x.id === id ? { ...x, tags } : x,
        );
      }
      return next;
    });
  }

  function addTag(id: string, current: string[]) {
    const tag = normalizeTags([tagDraft])[0];
    setTagDraft("");
    setTagOpen(null);
    if (!tag || current.includes(tag)) return;

    const prev = current;
    patchCardTags(id, normalizeTags([...current, tag]));

    const fd = new FormData();
    fd.append("ids", id);
    fd.set("tag", tag);
    fd.set("op", "add");
    startTransition(async () => {
      const res = await bulkTag(fd);
      if (res.ok) {
        toast.success(`Tagged “${tag}”.`);
      } else {
        patchCardTags(id, prev); // revert
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="overflow-x-auto pb-4">
      <datalist id="board-tag-suggest">
        {tagSuggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="flex min-w-max gap-4">
        {COLUMNS.map((col) => {
          const items = cols[col.key];
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                setOverCol(null);
                setDragId(null);
                if (id) move(id, col.key);
              }}
              className={`bg-secondary/30 flex w-72 flex-none flex-col rounded-lg border transition-colors ${
                overCol === col.key
                  ? "border-primary/50 bg-primary/5"
                  : "border-border"
              }`}
              aria-label={`${col.label} (${items.length})`}
            >
              <header className="border-border flex items-center justify-between border-b px-3 py-2.5">
                <h2 className="text-sm font-semibold">{col.label}</h2>
                <span className="text-muted-foreground bg-background rounded-full px-2 py-0.5 text-xs font-medium">
                  {items.length}
                </span>
              </header>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {items.length === 0 ? (
                  <li className="text-muted-foreground px-2 py-6 text-center text-xs">
                    Drop here
                  </li>
                ) : (
                  items.map((c) => (
                    <li
                      key={c.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(c.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      className={`border-border bg-background cursor-grab rounded-md border p-3 shadow-sm active:cursor-grabbing ${
                        dragId === c.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/leads/${c.id}`}
                          className="hover:text-primary text-sm font-medium"
                        >
                          {c.full_name}
                        </Link>
                        {c.assigned_to && assigneeNames[c.assigned_to] ? (
                          <span
                            className="bg-primary/10 text-primary inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-semibold"
                            title={`Assigned to ${assigneeNames[c.assigned_to]}`}
                            aria-label={`Assigned to ${assigneeNames[c.assigned_to]}`}
                          >
                            {initials(assigneeNames[c.assigned_to])}
                          </span>
                        ) : null}
                      </div>
                      {c.phone ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {c.phone}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {(c.tags ?? []).map((t) => (
                          <Link
                            key={t}
                            href={`/admin/leads/board?tag=${encodeURIComponent(t)}`}
                            className="border-border bg-secondary text-muted-foreground hover:text-primary rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {t}
                          </Link>
                        ))}
                        {tagOpen === c.id ? (
                          <input
                            type="text"
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag(c.id, c.tags ?? []);
                              } else if (e.key === "Escape") {
                                setTagOpen(null);
                                setTagDraft("");
                              }
                            }}
                            onBlur={() => {
                              setTagOpen(null);
                              setTagDraft("");
                            }}
                            placeholder="tag…"
                            aria-label={`Add a tag to ${c.full_name}`}
                            maxLength={30}
                            list="board-tag-suggest"
                            autoFocus
                            className="border-border bg-background focus:ring-ring h-5 w-20 rounded-full border px-2 text-[10px] focus:ring-2 focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTagOpen(c.id);
                              setTagDraft("");
                            }}
                            aria-label={`Add a tag to ${c.full_name}`}
                            title="Add tag"
                            className="border-border text-muted-foreground hover:text-primary inline-flex items-center rounded-full border border-dashed px-1.5 py-0.5"
                          >
                            <Plus className="h-3 w-3" aria-hidden />
                          </button>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-2 flex items-center justify-between text-[11px]">
                        <time dateTime={c.created_at}>
                          {new Date(c.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        {c.follow_up_at ? (
                          <time
                            dateTime={c.follow_up_at}
                            className={
                              new Date(c.follow_up_at).getTime() < now
                                ? "text-destructive font-medium"
                                : ""
                            }
                            title="Follow-up"
                          >
                            ⏰{" "}
                            {new Date(c.follow_up_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </time>
                        ) : null}
                      </div>
                      {/* Accessible / touch fallback for moving without drag. */}
                      <label className="sr-only" htmlFor={`move-${c.id}`}>
                        Move {c.full_name} to another column
                      </label>
                      <select
                        id={`move-${c.id}`}
                        value={c.status}
                        onChange={(e) => move(c.id, e.target.value as ColKey)}
                        className="border-border bg-background mt-2 h-7 w-full rounded border text-xs"
                      >
                        {COLUMNS.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
