"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleApprove } from "../actions";

export default function ApproveControl({
  id,
  isApproved,
}: {
  id: string;
  isApproved: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_approved", String(!isApproved));
    startTransition(async () => {
      const result = await toggleApprove(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={isApproved ? "outline" : "default"}
      onClick={onClick}
      disabled={pending}
      className="w-full"
    >
      {pending ? "..." : isApproved ? "Unapprove (hide)" : "Approve for public"}
    </Button>
  );
}
