"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { failStuckRun } from "./actions";

export default function FailRunButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      className="border-destructive/30 text-destructive hover:bg-destructive/10"
      onClick={() => {
        if (!window.confirm("Mark this run failed and release its topics?")) return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          const r = await failStuckRun(fd);
          if (r.ok) toast.success("Run marked failed.");
          else toast.error(r.error);
        });
      }}
    >
      {pending ? "…" : "Mark failed"}
    </Button>
  );
}
