"use client";

import * as React from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { INTAKE_ITEMS, type IntakeChecklist } from "@/lib/leads/limitations";

import { updateLeadIntake } from "./actions";

/** Six checkboxes the desk ticks on the first call. Each change saves. */
export default function IntakeControl({
  leadId,
  current,
}: {
  leadId: string;
  current: IntakeChecklist;
}) {
  const [state, setState] = React.useState<IntakeChecklist>(current);
  const [pending, startTransition] = React.useTransition();

  function toggle(key: keyof IntakeChecklist, on: boolean) {
    const next = { ...state, [key]: on };
    setState(next);
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("intake", JSON.stringify(next));
    startTransition(async () => {
      const result = await updateLeadIntake(fd);
      if (!result.ok) {
        toast.error(result.error);
        setState(state);
      }
    });
  }

  const done = INTAKE_ITEMS.filter((i) => state[i.key]).length;

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">
        {done} of {INTAKE_ITEMS.length} collected
      </p>
      {INTAKE_ITEMS.map((item) => (
        <label
          key={item.key}
          className="flex cursor-pointer items-start gap-2 text-sm"
        >
          <Checkbox
            checked={Boolean(state[item.key])}
            onCheckedChange={(v) => toggle(item.key, v === true)}
            disabled={pending}
            aria-label={item.label}
            className="mt-0.5"
          />
          <span>
            {item.label}
            {item.hint ? (
              <span className="text-muted-foreground block text-xs">
                {item.hint}
              </span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}
