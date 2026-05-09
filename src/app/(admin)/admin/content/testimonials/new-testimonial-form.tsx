"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createTestimonialAndRedirect } from "./actions";

export default function NewTestimonialForm() {
  const [open, setOpen] = React.useState(false);
  const [initials, setInitials] = React.useState("");
  const [quote, setQuote] = React.useState("");
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
        New testimonial
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!initials.trim() || quote.trim().length < 10) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTestimonialAndRedirect(fd);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-border bg-card p-4"
      style={{ minWidth: "min(420px, 100%)" }}
    >
      <div className="grid gap-1.5">
        <label
          htmlFor="t-initials"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Client initials
        </label>
        <Input
          id="t-initials"
          name="client_initials"
          required
          maxLength={10}
          value={initials}
          onChange={(e) =>
            setInitials(e.currentTarget.value.toUpperCase())
          }
          placeholder="J.S. or J.M.S."
        />
        <p className="text-xs text-muted-foreground">
          Initials only. Per CRPC §7.1 we never publish full client names.
        </p>
      </div>
      <div className="grid gap-1.5">
        <label
          htmlFor="t-quote"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Quote
        </label>
        <Textarea
          id="t-quote"
          name="quote"
          required
          minLength={10}
          maxLength={1500}
          rows={3}
          value={quote}
          onChange={(e) => setQuote(e.currentTarget.value)}
          placeholder="Mihran returned every call within an hour..."
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setInitials("");
            setQuote("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={
            pending || !initials.trim() || quote.trim().length < 10
          }
        >
          {pending ? "Creating..." : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
