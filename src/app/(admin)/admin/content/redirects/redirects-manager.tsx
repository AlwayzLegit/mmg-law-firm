"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createRedirect, deleteRedirect } from "./actions";

export type RedirectRow = {
  id: string;
  source_path: string;
  destination: string;
  permanent: boolean;
};

export default function RedirectsManager({ rows }: { rows: RedirectRow[] }) {
  const [pending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("permanent", fd.get("permanent") ? "true" : "false");
    startTransition(async () => {
      const result = await createRedirect(fd);
      if (result.ok) {
        toast.success("Redirect added.");
        formRef.current?.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onDelete(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await deleteRedirect(fd);
      if (result.ok) toast.success("Redirect removed.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-6">
      <form
        ref={formRef}
        onSubmit={onAdd}
        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="grid gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          From (path)
          <Input
            name="source_path"
            required
            placeholder="/old-url"
            pattern="^/[^\s?#]*$"
            className="font-normal normal-case"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          To (path or URL)
          <Input
            name="destination"
            required
            placeholder="/new-url or https://…"
            className="font-normal normal-case"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              name="permanent"
              defaultChecked
              className="h-4 w-4 rounded border-border"
            />
            301
          </label>
          <Button type="submit" disabled={pending} size="sm">
            Add
          </Button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No redirects yet. Add one above to send an old URL to a new one.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                  {r.source_path}
                </code>
                <ArrowRight
                  className="h-3.5 w-3.5 flex-none text-muted-foreground"
                  aria-hidden
                />
                <code className="truncate rounded bg-secondary px-1.5 py-0.5 text-xs">
                  {r.destination}
                </code>
                <span className="text-xs text-muted-foreground">
                  {r.permanent ? "301" : "302"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onDelete(r.id)}
                disabled={pending}
                aria-label={`Delete redirect from ${r.source_path}`}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
