"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";

import { togglePublishBlogPost } from "../actions";

type Props = {
  id: string;
  isPublished: boolean;
  publishedAt: string | null;
};

export default function PublishControl({
  id,
  isPublished,
  publishedAt,
}: Props) {
  const [pending, startTransition] = React.useTransition();

  // Freeze "now" at mount.
  const [mountedAt] = React.useState(() => Date.now());
  const scheduled =
    isPublished &&
    publishedAt != null &&
    new Date(publishedAt).getTime() > mountedAt;

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(!isPublished));
    startTransition(async () => {
      const result = await togglePublishBlogPost(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      {scheduled && publishedAt ? (
        <div className="bg-warning/10 flex items-start gap-2 rounded-md p-3 text-xs">
          <Clock
            className="text-warning mt-0.5 h-4 w-4 flex-none"
            aria-hidden
          />
          <span>
            Marked published, but{" "}
            <code className="bg-secondary rounded px-1 py-0.5 text-[11px]">
              published_at
            </code>{" "}
            is{" "}
            <strong>
              {new Date(publishedAt).toLocaleString("en-US", {
                timeZone: FIRM.timeZone,
              })}
            </strong>
            . The post stays hidden until that time.
          </span>
        </div>
      ) : null}

      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        onClick={onClick}
        disabled={pending}
        className="w-full"
      >
        {pending ? "..." : isPublished ? "Unpublish" : "Publish"}
      </Button>

      <p className="text-muted-foreground text-xs">
        {isPublished
          ? "Toggle off to hide the post immediately."
          : "Publishing now sets published_at to right now (unless you set a future date in the form)."}
      </p>
    </div>
  );
}
