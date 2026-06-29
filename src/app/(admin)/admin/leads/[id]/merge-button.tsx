"use client";

import * as React from "react";
import { toast } from "sonner";
import { Merge } from "lucide-react";

import { mergeLead } from "./actions";

/** Merge a related (duplicate) lead into the current primary lead. */
export default function MergeButton({
  primaryId,
  duplicateId,
  duplicateName,
}: {
  primaryId: string;
  duplicateId: string;
  duplicateName: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function onMerge() {
    if (
      !window.confirm(
        `Merge "${duplicateName}" into this lead? Its notes, messages, and tasks move here and the duplicate is closed.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("primaryId", primaryId);
    fd.set("duplicateId", duplicateId);
    startTransition(async () => {
      const res = await mergeLead(fd);
      if (res.ok) toast.success("Lead merged.");
      else toast.error(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onMerge}
      disabled={pending}
      className="text-muted-foreground hover:text-primary inline-flex flex-none items-center gap-1 text-xs font-medium disabled:opacity-50"
    >
      <Merge className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Merging…" : "Merge in"}
    </button>
  );
}
