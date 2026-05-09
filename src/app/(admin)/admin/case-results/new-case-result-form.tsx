"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createCaseResultAndRedirect } from "./actions";

export default function NewCaseResultForm() {
  const [open, setOpen] = React.useState(false);
  const [headline, setHeadline] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New result
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (headline.trim().length < 8) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCaseResultAndRedirect(fd);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        name="headline"
        autoFocus
        required
        minLength={8}
        maxLength={220}
        value={headline}
        onChange={(e) => setHeadline(e.currentTarget.value)}
        placeholder="$1.2M settlement — pedestrian struck in crosswalk"
        className="h-9 w-96"
      />
      <Button type="submit" size="sm" disabled={pending || headline.trim().length < 8}>
        {pending ? "Creating..." : "Create draft"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setHeadline("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </form>
  );
}
