"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteTag, renameTag } from "../actions";

export default function TagRow({ tag, count }: { tag: string; count: number }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(tag);
  const [pending, startTransition] = React.useTransition();

  function rename() {
    const next = value.trim().toLowerCase();
    if (!next || next === tag) {
      setEditing(false);
      setValue(tag);
      return;
    }
    const fd = new FormData();
    fd.set("from", tag);
    fd.set("to", next);
    startTransition(async () => {
      const res = await renameTag(fd);
      if (res.ok) {
        toast.success(`Renamed “${tag}” → “${next}”.`);
        setEditing(false);
      } else {
        toast.error(res.error);
        setValue(tag);
      }
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Remove the tag “${tag}” from all ${count} lead${count === 1 ? "" : "s"}? This can't be undone.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("tag", tag);
    startTransition(async () => {
      const res = await deleteTag(fd);
      if (res.ok) toast.success(`Removed tag “${tag}”.`);
      else toast.error(res.error);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      {editing ? (
        <span className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                rename();
              } else if (e.key === "Escape") {
                setEditing(false);
                setValue(tag);
              }
            }}
            maxLength={30}
            autoFocus
            aria-label={`Rename tag ${tag}`}
            className="border-border bg-background focus:ring-ring h-8 w-48 rounded-md border px-2 text-sm focus:ring-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={rename}
            disabled={pending}
            aria-label="Save"
            className="text-success hover:bg-secondary rounded-md p-1.5"
          >
            <Check className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(tag);
            }}
            disabled={pending}
            aria-label="Cancel"
            className="text-muted-foreground hover:bg-secondary rounded-md p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <span className="text-muted-foreground text-xs">
            Rename to an existing tag to merge them.
          </span>
        </span>
      ) : (
        <>
          <Link
            href={`/admin/leads?tag=${encodeURIComponent(tag)}`}
            className="hover:text-primary text-sm font-medium"
          >
            {tag}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">
              {count} lead{count === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              aria-label={`Rename tag ${tag}`}
              className="text-muted-foreground hover:text-primary rounded-md p-1.5"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Delete tag ${tag}`}
              className="text-muted-foreground hover:text-destructive rounded-md p-1.5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </li>
  );
}
