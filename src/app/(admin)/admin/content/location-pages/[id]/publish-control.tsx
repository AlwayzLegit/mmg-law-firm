"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { togglePublish, touchReviewed } from "../actions";

const STALE_DAYS = 365;

type Props = {
  id: string;
  isPublished: boolean;
  hasAngle: boolean;
  lastReviewedAt: string | null;
};

export default function PublishControl({
  id,
  isPublished,
  hasAngle,
  lastReviewedAt,
}: Props) {
  const [pending, startTransition] = React.useTransition();

  // Freeze "now" at mount via lazy useState init so the staleness
  // indicator doesn't flicker if React re-renders.
  const [mountedAt] = React.useState(() => Date.now());
  const reviewedAt = lastReviewedAt ? new Date(lastReviewedAt) : null;
  const ageDays = reviewedAt
    ? Math.floor(
        (mountedAt - reviewedAt.getTime()) / (24 * 60 * 60 * 1000),
      )
    : null;
  const isStale =
    isPublished && (ageDays === null || ageDays > STALE_DAYS);

  function fire(action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, fd: FormData) {
    startTransition(async () => {
      const result = await action(fd);
      if (result.ok) {
        toast.success("Done.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  function onTogglePublish(next: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("is_published", String(next));
    fire(togglePublish as (fd: FormData) => Promise<{ ok: boolean; error?: string }>, fd);
  }

  function onTouch() {
    const fd = new FormData();
    fd.set("id", id);
    fire(touchReviewed as (fd: FormData) => Promise<{ ok: boolean; error?: string }>, fd);
  }

  return (
    <div className="grid gap-3">
      {hasAngle ? (
        <div className="flex items-start gap-2 rounded-md bg-success/10 p-3 text-xs">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 flex-none text-success"
            aria-hidden
          />
          <span>Local angle is set — eligible to publish.</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-none text-warning"
            aria-hidden
          />
          <span>
            <strong className="text-foreground">Cannot publish.</strong>{" "}
            local_angle_md is empty. Per CRPC §7.1 we don&apos;t publish city ×
            practice pages without locally-specific content.
          </span>
        </div>
      )}

      {isStale ? (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-none text-warning"
            aria-hidden
          />
          <span>
            <strong className="text-foreground">Review overdue.</strong>{" "}
            {ageDays === null
              ? "Never reviewed."
              : `${ageDays} days since last review (12-month limit per spec §10.4).`}
          </span>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          variant={isPublished ? "outline" : "default"}
          onClick={() => onTogglePublish(!isPublished)}
          disabled={pending || (!isPublished && !hasAngle)}
        >
          {pending
            ? "..."
            : isPublished
              ? "Unpublish"
              : "Publish"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTouch}
          disabled={pending}
        >
          Mark reviewed (today)
        </Button>
      </div>
    </div>
  );
}
