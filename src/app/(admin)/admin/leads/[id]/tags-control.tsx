"use client";

import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { normalizeTags } from "@/lib/leads/tags";

import { setLeadTags } from "./actions";

export default function TagsControl({
  leadId,
  initial,
  suggestions = [],
}: {
  leadId: string;
  initial: string[];
  suggestions?: string[];
}) {
  const [tags, setTags] = React.useState<string[]>(initial);
  const [draft, setDraft] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  // Don't suggest tags this lead already has.
  const available = suggestions.filter((s) => !tags.includes(s));
  const listId = `tag-suggest-${leadId}`;

  function persist(next: string[]) {
    const prev = tags;
    setTags(next);
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("tags", JSON.stringify(next));
    startTransition(async () => {
      const res = await setLeadTags(fd);
      if (!res.ok) {
        setTags(prev); // revert
        toast.error(res.error);
      }
    });
  }

  function addFromDraft() {
    const next = normalizeTags([...tags, draft]);
    setDraft("");
    if (next.length === tags.length) return; // empty or duplicate
    persist(next);
  }

  function remove(tag: string) {
    persist(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      {tags.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t}>
              <span className="border-border bg-secondary inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium">
                {t}
                <button
                  type="button"
                  onClick={() => remove(t)}
                  disabled={pending}
                  aria-label={`Remove tag ${t}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mb-3 text-xs">
          No tags yet. Add labels like &ldquo;spanish&rdquo;,
          &ldquo;high-value&rdquo;, or &ldquo;referral&rdquo;.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addFromDraft();
            }
          }}
          placeholder="Add a tag…"
          aria-label="Add a tag"
          maxLength={30}
          list={listId}
          className="border-border bg-background focus:ring-ring h-9 flex-1 rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
        />
        <datalist id={listId}>
          {available.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={addFromDraft}
          disabled={pending || draft.trim() === ""}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
