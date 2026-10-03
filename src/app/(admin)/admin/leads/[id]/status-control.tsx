"use client";

import * as React from "react";
import { toast } from "sonner";

import { adminBtn } from "@/components/admin/ui";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { updateLeadStatus } from "./actions";
import { LEAD_STATUSES } from "./statuses";

type Props = {
  leadId: string;
  currentStatus: string;
  currentReason: string | null;
};

/**
 * Pipeline segmented control. Clicking a stage saves immediately; "rejected"
 * first asks for a reason (saved with the status).
 */
export default function StatusControl({ leadId, currentStatus, currentReason }: Props) {
  const [status, setStatus] = React.useState(currentStatus);
  const [reason, setReason] = React.useState(currentReason ?? "");
  const [pending, startTransition] = React.useTransition();

  function save(next: string, nextReason: string) {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("status", next);
    if (next === "rejected") fd.set("rejection_reason", nextReason);
    startTransition(async () => {
      const result = await updateLeadStatus(fd);
      if (result.ok) toast.success(`Status: ${next}.`);
      else toast.error(result.error);
    });
  }

  function pick(next: string) {
    setStatus(next);
    if (next === "rejected") return; // wait for the reason + Save
    save(next, reason);
  }

  const reasonDirty = status === "rejected" && (status !== currentStatus || reason !== (currentReason ?? ""));

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Pipeline status"
        className="bg-card ring-ink/8 flex flex-wrap gap-1 rounded-xl p-1.5 ring-1"
      >
        {LEAD_STATUSES.map((s) => {
          const on = s === status;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() => pick(s)}
              className={cn(
                "h-[38px] flex-[1_1_100px] rounded-lg text-[12.5px] font-semibold capitalize transition-colors disabled:opacity-60",
                on ? "bg-ink text-cream" : "text-stone hover:bg-paper hover:text-foreground",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {status === "rejected" ? (
        <div className="bg-card ring-ink/8 mt-2 grid gap-2 rounded-xl p-3.5 ring-1">
          <label htmlFor="rejection_reason" className="micro-label text-stone">
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
          <div className="flex gap-2">
            <button type="button" disabled={pending || !reasonDirty} onClick={() => save("rejected", reason)} className={adminBtn.ink}>
              {pending ? "Saving…" : "Save rejection"}
            </button>
            {currentStatus !== "rejected" ? (
              <button type="button" disabled={pending} onClick={() => setStatus(currentStatus)} className={adminBtn.outline}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
