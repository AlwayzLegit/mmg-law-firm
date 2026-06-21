"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { bulkTouchReviewed } from "../location-pages/actions";

/** Marks every currently-stale page reviewed in one action. */
export default function BulkReviewButton({ ids }: { ids: string[] }) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Mark all ${ids.length} stale page${ids.length === 1 ? "" : "s"} reviewed now? Only do this once you've confirmed the content is still accurate.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    for (const id of ids) fd.append("ids", id);
    startTransition(async () => {
      const result = await bulkTouchReviewed(fd);
      if (result.ok) {
        toast.success(
          `Marked ${result.updated} page${result.updated === 1 ? "" : "s"} reviewed.`,
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="border-border bg-card hover:bg-secondary inline-flex flex-none items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
    >
      <CheckCheck className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Marking…" : "Mark all reviewed"}
    </button>
  );
}
