"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { markLegalPageReviewed } from "../actions";

export default function ReviewButton({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await markLegalPageReviewed(fd);
      if (result.ok) toast.success("Marked reviewed.");
      else toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className="w-full gap-1.5"
    >
      <Check className="h-3.5 w-3.5" aria-hidden />
      {pending ? "..." : "Mark reviewed now"}
    </Button>
  );
}
