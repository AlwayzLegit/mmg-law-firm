"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { createLocationPageAndRedirect } from "./actions";

type Option = { id: string; label: string };

type Props = {
  cities: Option[];
  practiceAreas: Option[];
};

export default function CreateRow({ cities, practiceAreas }: Props) {
  const [open, setOpen] = React.useState(false);
  const [city, setCity] = React.useState("");
  const [practice, setPractice] = React.useState("");
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
        New page
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!city || !practice) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      // Server action redirects on success; on failure it returns a result.
      const result = await createLocationPageAndRedirect(fd);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="grid gap-1.5">
        <label
          htmlFor="cl-city"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          City
        </label>
        <select
          id="cl-city"
          name="city_id"
          required
          value={city}
          onChange={(e) => setCity(e.currentTarget.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Choose a city...</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label
          htmlFor="cl-practice"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Practice area
        </label>
        <select
          id="cl-practice"
          name="practice_area_id"
          required
          value={practice}
          onChange={(e) => setPractice(e.currentTarget.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Choose a practice...</option>
          {practiceAreas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || !city || !practice}
        >
          {pending ? "Creating..." : "Create draft"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setCity("");
            setPractice("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
