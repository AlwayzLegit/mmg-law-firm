"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { touchReviewed } from "../location-pages/actions";

/** One-click "reviewed now" for a stale page, straight from the content
 *  overview — no need to open each editor. */
export default function ReviewRowButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await touchReviewed(fd);
      if (result.ok) toast.success("Marked reviewed.");
      else toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="border-border hover:bg-secondary text-foreground inline-flex flex-none items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
    >
      <Check className="h-3 w-3" aria-hidden />
      {pending ? "…" : "Reviewed"}
    </button>
  );
}
