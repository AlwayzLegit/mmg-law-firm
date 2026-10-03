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
            className="border-ink/14 bg-card focus:border-gold focus:ring-gold/25 h-8 w-48 rounded-[8px] border px-2 text-[13px] outline-none focus:ring-2"
          />
          <button
            type="button"
            onClick={rename}
            disabled={pending}
            aria-label="Save"
            className="hover:bg-ink/6 rounded-md p-1.5 text-[#15803d]"
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
            className="text-stone hover:bg-ink/6 rounded-md p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <span className="text-stone text-xs">
            Rename to an existing tag to merge them.
          </span>
        </span>
      ) : (
        <>
          <Link
            href={`/admin/leads?tag=${encodeURIComponent(tag)}`}
            className="text-foreground hover:text-gold-deep text-[13px] font-semibold no-underline"
          >
            {tag}
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-ink/8 text-stone rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
              {count} lead{count === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              aria-label={`Rename tag ${tag}`}
              className="text-stone hover:text-foreground rounded-md p-1.5"
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Delete tag ${tag}`}
              className="text-stone rounded-md p-1.5 hover:text-[#b91c1c]"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </li>
  );
}
