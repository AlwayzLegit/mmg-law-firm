"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { updateLeadStatus } from "./actions";
import { LEAD_STATUSES } from "./statuses";

type Props = {
  leadId: string;
  currentStatus: string;
  currentReason: string | null;
};

export default function StatusControl({
  leadId,
  currentStatus,
  currentReason,
}: Props) {
  const [status, setStatus] = React.useState(currentStatus);
  const [reason, setReason] = React.useState(currentReason ?? "");
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLeadStatus(fd);
      if (result.ok) {
        toast.success("Status updated.");
      } else {
        toast.error(result.error);
      }
    });
  }

  const dirty = status !== currentStatus || reason !== (currentReason ?? "");

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid gap-1.5">
        <label
          htmlFor="status"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.currentTarget.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {status === "rejected" ? (
        <div className="grid gap-1.5">
          <label
            htmlFor="rejection_reason"
            className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            Rejection reason
          </label>
          <Textarea
            id="rejection_reason"
            name="rejection_reason"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            placeholder="Conflict, outside SOL, fee not justified, etc."
          />
        </div>
      ) : null}

      <Button type="submit" disabled={pending || !dirty} size="sm">
        {pending ? "Saving..." : dirty ? "Save changes" : "No changes"}
      </Button>
    </form>
  );
}
