"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { togglePublishLegalPage } from "../actions";

type Props = {
  id: string;
  isPublished: boolean;
  hasBody: boolean;
  lastReviewedAt: string | null;
};

export default function PublishControl({
  id,
  isPublished,
  hasBody,
  lastReviewedAt,
}: Props) {
  const [pending, startTransition] = React.useTransition();
  const reviewed = Boolean(lastReviewedAt);
  const publishable = hasBody && reviewed;

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(!isPublished));
    startTransition(async () => {
      const result = await togglePublishLegalPage(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      {!isPublished && !publishable ? (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-none text-destructive"
            aria-hidden
          />
          <span>
            {!hasBody
              ? "Body is empty. Save body copy first — publishing without it would render the in-code template as if it were attorney-reviewed."
              : "Mark the page as reviewed first — spec §10.4 requires legal pages to be reviewed within 12 months."}
          </span>
        </div>
      ) : null}

      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        onClick={onClick}
        disabled={pending || (!isPublished && !publishable)}
        className="w-full"
      >
        {pending ? "..." : isPublished ? "Unpublish" : "Publish"}
      </Button>

      <p className="text-xs text-muted-foreground">
        {isPublished
          ? "Toggle off to revert the public page to the in-code fallback."
          : "Publishing makes the DB body the canonical source for the public page."}
      </p>
    </div>
  );
}
