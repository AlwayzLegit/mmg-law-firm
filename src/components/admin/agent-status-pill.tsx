import { cn } from "@/lib/utils";

const RUN: Record<string, string> = {
  running: "bg-brand-50 text-brand-600",
  succeeded: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  needs_human: "bg-warning/10 text-warning",
};
const TOPIC: Record<string, string> = {
  queued: "bg-secondary text-muted-foreground",
  claimed: "bg-brand-50 text-brand-600",
  drafted: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  skipped: "bg-secondary text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
};
const QUESTION: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  answered: "bg-success/10 text-success",
  dismissed: "bg-secondary text-muted-foreground",
};

export function StatusPill({
  kind,
  value,
  className,
}: {
  kind: "run" | "topic" | "question";
  value: string;
  className?: string;
}) {
  const map = kind === "run" ? RUN : kind === "topic" ? TOPIC : QUESTION;
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        map[value] ?? "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}
