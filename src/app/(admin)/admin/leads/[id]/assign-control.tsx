"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { assignLead } from "./actions";

export type AdminOption = { userId: string; label: string };

export default function AssignControl({
  leadId,
  current,
  admins,
}: {
  leadId: string;
  current: string | null;
  admins: AdminOption[];
}) {
  const [value, setValue] = React.useState(current ?? "");
  const [pending, startTransition] = React.useTransition();

  const dirty = value !== (current ?? "");

  function save() {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("assignee", value);
    startTransition(async () => {
      const result = await assignLead(fd);
      if (result.ok) {
        toast.success(value ? "Lead assigned." : "Lead unassigned.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-3">
      <select
        aria-label="Assign lead to"
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        className="border-border bg-background focus:ring-ring h-9 rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
      >
        <option value="">Unassigned</option>
        {admins.map((a) => (
          <option key={a.userId} value={a.userId}>
            {a.label}
          </option>
        ))}
      </select>

      <Button size="sm" onClick={save} disabled={pending || !dirty}>
        {pending ? "Saving..." : "Save assignment"}
      </Button>
    </div>
  );
}
