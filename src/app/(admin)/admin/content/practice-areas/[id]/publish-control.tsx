"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { togglePublishPracticeArea } from "../actions";

type Props = {
  id: string;
  isPublished: boolean;
  hasBody: boolean;
  hasFaqs: boolean;
  hasSubtopics: boolean;
};

export default function PublishControl({
  id,
  isPublished,
  hasBody,
  hasFaqs,
  hasSubtopics,
}: Props) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(!isPublished));
    startTransition(async () => {
      const result = await togglePublishPracticeArea(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  const warnings: string[] = [];
  if (!hasFaqs) {
    warnings.push("FAQs are empty — the FAQPage JSON-LD won't render.");
  }
  if (!hasSubtopics) {
    warnings.push(
      "Subtopics are empty — the “What we handle” block won't render.",
    );
  }

  return (
    <div className="grid gap-3">
      {!hasBody ? (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-none text-destructive"
            aria-hidden
          />
          <span>
            Body is empty. Save body copy first — publishing without it
            would still render the in-code fallback as if it were
            attorney-reviewed.
          </span>
        </div>
      ) : null}

      {warnings.length > 0 && hasBody && !isPublished ? (
        <div className="grid gap-1 rounded-md bg-warning/10 p-3 text-xs">
          {warnings.map((w) => (
            <p key={w} className="leading-relaxed">
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        variant={isPublished ? "outline" : "default"}
        onClick={onClick}
        disabled={pending || (!isPublished && !hasBody)}
        className="w-full"
      >
        {pending ? "..." : isPublished ? "Unpublish" : "Publish"}
      </Button>

      <p className="text-xs text-muted-foreground">
        {isPublished
          ? "Toggle off to revert the public page to the in-code fallback."
          : "Publishing makes the DB content the canonical source for the public page."}
      </p>
    </div>
  );
}
