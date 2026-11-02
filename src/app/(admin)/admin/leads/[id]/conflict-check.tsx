"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";

import { runConflictCheck, type ConflictHit } from "./actions";

type Props = {
  leadId: string;
  lastCheckedAt: string | null;
  lastClear: boolean | null;
};

export default function ConflictCheckButton({
  leadId,
  lastCheckedAt,
  lastClear,
}: Props) {
  const [pending, startTransition] = React.useTransition();
  const [hits, setHits] = React.useState<ConflictHit[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    setHits(null);
    const fd = new FormData();
    fd.set("leadId", leadId);
    startTransition(async () => {
      const result = await runConflictCheck(fd);
      if (result.ok) {
        setHits(result.hits);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <ShieldQuestion className="text-primary h-4 w-4" aria-hidden />
          <span>
            {lastCheckedAt
              ? `Last checked ${new Date(lastCheckedAt).toLocaleString("en-US", { timeZone: FIRM.timeZone })} — ${lastClear ? "no conflicts found" : "review hits below"}`
              : "Not yet checked"}
          </span>
        </div>
        <Button onClick={onClick} disabled={pending} size="sm">
          {pending ? "Checking..." : "Run conflict check"}
        </Button>
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      {hits !== null ? (
        hits.length === 0 ? (
          <div className="border-success/40 bg-success/10 flex items-start gap-3 rounded-md border p-3 text-sm">
            <CheckCircle2
              className="text-success mt-0.5 h-4 w-4 flex-none"
              aria-hidden
            />
            <div>
              <p className="font-medium">No automated conflicts found.</p>
              <p className="text-muted-foreground mt-1 text-xs">
                A human review is still required before a representation
                agreement is signed.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="border-warning/40 bg-warning/10 flex items-start gap-3 rounded-md border p-3 text-sm">
              <AlertTriangle
                className="text-warning mt-0.5 h-4 w-4 flex-none"
                aria-hidden
              />
              <p className="font-medium">
                {hits.length} potential conflict{hits.length === 1 ? "" : "s"} —
                manual review required.
              </p>
            </div>
            <ul className="grid gap-2">
              {hits.map((h, i) => (
                <li
                  key={`${h.source}-${h.id}-${i}`}
                  className="border-border bg-card rounded-md border p-3 text-sm"
                >
                  <p className="font-medium">{h.label}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {h.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
