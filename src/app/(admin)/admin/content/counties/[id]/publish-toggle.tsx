"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { togglePublishCounty } from "../actions";

export default function PublishToggle({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(!isPublished));
    startTransition(async () => {
      const result = await togglePublishCounty(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={isPublished ? "outline" : "default"}
      onClick={onClick}
      disabled={pending}
      className="w-full"
    >
      {pending ? "..." : isPublished ? "Unpublish" : "Publish"}
    </Button>
  );
}
