"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { togglePublishAttorneyProfile } from "../actions";

type Props = {
  id: string;
  isPublished: boolean;
  hasBarNumber: boolean;
  hasBio: boolean;
  hasHeadshot: boolean;
};

export default function PublishControl({
  id,
  isPublished,
  hasBarNumber,
  hasBio,
  hasHeadshot,
}: Props) {
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(!isPublished));
    startTransition(async () => {
      const result = await togglePublishAttorneyProfile(fd);
      if (result.ok) toast.success("Done.");
      else toast.error(result.error);
    });
  }

  const warnings: string[] = [];
  if (!hasBio) {
    warnings.push("Long-form bio is empty — page will fall back to a placeholder.");
  }
  if (!hasHeadshot) {
    warnings.push("No headshot uploaded — page will use the gradient placeholder.");
  }

  return (
    <div className="grid gap-3">
      {!hasBarNumber ? (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-xs">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-none text-destructive"
            aria-hidden
          />
          <span>
            Bar number is required to publish — set it in the form on the
            left.
          </span>
        </div>
      ) : null}

      {warnings.length > 0 && !isPublished ? (
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
        disabled={pending || (!isPublished && !hasBarNumber)}
        className="w-full"
      >
        {pending ? "..." : isPublished ? "Unpublish" : "Publish"}
      </Button>

      <p className="text-xs text-muted-foreground">
        {isPublished
          ? "Toggle off to hide the bio page and remove the attorney card from the homepage."
          : "Publishing makes the bio page live and surfaces the profile in the homepage attorney card and JSON-LD."}
      </p>
    </div>
  );
}
