"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setLeadFollowUp } from "./actions";

/** ISO → "YYYY-MM-DDTHH:MM" in the viewer's local time, for datetime-local. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FollowUpControl({
  leadId,
  current,
}: {
  leadId: string;
  current: string | null;
}) {
  const [value, setValue] = React.useState(toLocalInput(current));
  const [pending, startTransition] = React.useTransition();
  // Captured once so render stays pure (no Date.now() during render).
  const [now] = React.useState(() => Date.now());

  const overdue = current ? new Date(current).getTime() < now : false;

  function submit(clear: boolean) {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("follow_up_at", clear ? "" : value);
    startTransition(async () => {
      const result = await setLeadFollowUp(fd);
      if (result.ok) {
        toast.success(clear ? "Follow-up cleared." : "Follow-up set.");
        if (clear) setValue("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-3">
      {current ? (
        <p
          className={`text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {overdue ? "Overdue since " : "Scheduled for "}
          {new Date(current).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No reminder set. Pick a date to add this lead to the follow-ups
          queue.
        </p>
      )}

      <input
        type="datetime-local"
        aria-label="Follow-up date and time"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => submit(false)}
          disabled={pending || !value}
        >
          {pending ? "Saving..." : "Set reminder"}
        </Button>
        {current ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => submit(true)}
            disabled={pending}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
