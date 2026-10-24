import { cn } from "@/lib/utils";
import { describeDaysLeft, type Deadline } from "@/lib/leads/limitations";

const TONE: Record<Deadline["tone"], string> = {
  ok: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
  passed: "bg-destructive text-destructive-foreground",
};

/** Compact "Jun 15, 2028 · in about 20 months" chip for a deadline. */
export default function DeadlineBadge({
  deadline,
  className,
}: {
  deadline: Deadline;
  className?: string;
}) {
  const date = new Date(deadline.date + "T00:00:00Z").toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium",
        TONE[deadline.tone],
        className,
      )}
      title={`${deadline.rule.label} — ${deadline.rule.authority}`}
    >
      <span className="tabular-nums">{date}</span>
      <span className="opacity-80">· {describeDaysLeft(deadline.daysLeft)}</span>
    </span>
  );
}
