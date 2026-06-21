"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { createSavedView, deleteSavedView } from "./actions";

export type SavedView = { id: string; name: string; query: string };

export default function SavedViews({
  views,
  currentQuery,
  activeQuery,
}: {
  views: SavedView[];
  /** Current filters as a querystring (no leading "?", page stripped). */
  currentQuery: string;
  /** Same, but what counts as "active" for highlighting. */
  activeQuery: string;
}) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("name", trimmed);
    fd.set("query", currentQuery);
    startTransition(async () => {
      const res = await createSavedView(fd);
      if (res.ok) {
        toast.success(`Saved view “${trimmed}”.`);
        setName("");
        setAdding(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove(id: string, label: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await deleteSavedView(fd);
      if (res.ok) toast.success(`Removed “${label}”.`);
      else toast.error(res.error);
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
        Views:
      </span>

      {views.length === 0 ? (
        <span className="text-muted-foreground text-xs">none saved yet</span>
      ) : (
        views.map((v) => {
          const active = v.query === activeQuery;
          return (
            <span
              key={v.id}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <Link href={`/admin/leads${v.query ? `?${v.query}` : ""}`}>
                {v.name}
              </Link>
              <button
                type="button"
                onClick={() => remove(v.id, v.name)}
                disabled={pending}
                aria-label={`Delete view ${v.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          );
        })
      )}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                setAdding(false);
                setName("");
              }
            }}
            placeholder="View name"
            aria-label="Saved view name"
            maxLength={60}
            autoFocus
            className="border-border bg-background focus:ring-ring h-7 w-32 rounded-md border px-2 text-xs focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending || name.trim() === ""}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 rounded-md px-2 text-xs font-medium disabled:opacity-50"
          >
            Save
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-border hover:bg-secondary text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
          title="Save the current filters as a view"
        >
          <Plus className="h-3 w-3" aria-hidden />
          Save current
        </button>
      )}
    </div>
  );
}
