import { cn } from "@/lib/utils";

const GOOD = "bg-[rgba(22,163,74,.12)] text-[#15803d]";
const WARN = "bg-gold/18 text-gold-deep";
const BAD = "bg-[rgba(220,38,38,.1)] text-[#b91c1c]";
const MUTED = "bg-ink/8 text-stone";
const ACTIVE = "bg-[rgba(43,70,216,.1)] text-status-new";

const RUN: Record<string, string> = {
  running: ACTIVE,
  succeeded: GOOD,
  failed: BAD,
  needs_human: WARN,
};
const TOPIC: Record<string, string> = {
  queued: MUTED,
  claimed: ACTIVE,
  drafted: WARN,
  published: GOOD,
  skipped: MUTED,
  rejected: BAD,
};
const QUESTION: Record<string, string> = {
  open: WARN,
  answered: GOOD,
  dismissed: MUTED,
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
        "inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap",
        map[value] ?? MUTED,
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
