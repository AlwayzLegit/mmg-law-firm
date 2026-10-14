"use client";

import * as React from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { reviewBlogPost } from "../actions";

type Props = {
  id: string;
  reviewStatus: string;
  isPublished: boolean;
  createdVia: string;
};

const LABEL: Record<string, string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approved: "Approved — ready to publish",
  published: "Published",
  rejected: "Rejected",
};

export default function ReviewControl({ id, reviewStatus, isPublished, createdVia }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [note, setNote] = React.useState("");

  function decide(decision: "approved" | "rejected" | "needs_review") {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("decision", decision);
    if (note.trim()) fd.set("note", note.trim());
    startTransition(async () => {
      const r = await reviewBlogPost(fd);
      if (r.ok) {
        toast.success(
          decision === "approved" ? "Approved." : decision === "rejected" ? "Rejected — topic returned to the queue." : "Reopened for review.",
        );
        setNote("");
      } else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-3 text-sm">
      <p>
        <span className="text-muted-foreground">Status:</span>{" "}
        <span className="font-medium">{LABEL[reviewStatus] ?? reviewStatus}</span>
      </p>
      {createdVia === "agent" ? (
        <p className="text-muted-foreground text-xs">
          Written by the content agent. Per CRPC 7.1 an attorney must review
          AI-drafted copy before it goes live — read it in full, then approve
          and publish, or reject with a note (the note goes back to the agent
          with its topic).
        </p>
      ) : null}
      {isPublished ? (
        <p className="text-muted-foreground text-xs">
          Published posts can&apos;t change review state. Unpublish first.
        </p>
      ) : (
        <>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            placeholder="Optional reviewer note (sent back to the agent on reject)"
            className="min-h-16 text-sm"
            maxLength={1000}
          />
          <div className="flex flex-wrap gap-2">
            {reviewStatus !== "approved" ? (
              <Button type="button" size="sm" onClick={() => decide("approved")} disabled={pending} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approve
              </Button>
            ) : null}
            {reviewStatus !== "rejected" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => decide("rejected")}
                disabled={pending}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden /> Reject
              </Button>
            ) : null}
            {reviewStatus === "approved" || reviewStatus === "rejected" ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => decide("needs_review")} disabled={pending} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reopen
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
