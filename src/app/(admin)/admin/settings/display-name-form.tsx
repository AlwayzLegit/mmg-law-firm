"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { updateOwnDisplayName } from "./actions";

export default function DisplayNameForm({ current }: { current: string }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(current);
  const [pending, startTransition] = React.useTransition();

  function save() {
    const next = value.trim();
    if (next === current || next === "") {
      setEditing(false);
      setValue(current);
      return;
    }
    const fd = new FormData();
    fd.set("full_name", next);
    startTransition(async () => {
      const res = await updateOwnDisplayName(fd);
      if (res.ok) {
        toast.success("Name updated.");
        setEditing(false);
      } else {
        toast.error(res.error);
        setValue(current);
      }
    });
  }

  if (!editing) {
    return (
      <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          Name
        </span>
        <span className="flex items-center gap-2">
          <span>{current || "—"}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit your display name"
            className="text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        Name
      </span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              setEditing(false);
              setValue(current);
            }
          }}
          maxLength={100}
          autoFocus
          aria-label="Your display name"
          className="border-border bg-background focus:ring-ring h-8 flex-1 rounded-md border px-2 text-sm focus:ring-2 focus:outline-none"
        />
        <Button size="sm" onClick={save} disabled={pending}>
          Save
        </Button>
      </span>
    </div>
  );
}
