import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Page header: optional eyebrow, Newsreader title, helper text, actions. */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional back link rendered above the title. */
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-5", className)}>
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="text-stone hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-[13px] no-underline">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-gold-deep m-0 text-xs font-semibold tracking-[0.14em] uppercase">{eyebrow}</p> : null}
        <h1 className={cn("font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]", eyebrow && "mt-1.5")}>{title}</h1>
        {description ? <p className="text-stone mt-1.5 max-w-[70ch] text-[13px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Numeric stat card: micro label, Newsreader value, optional sub line. */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "good" | "warn";
  href?: string;
}) {
  const body = (
    <>
      <p className="micro-label text-stone m-0">{label}</p>
      <p className="font-display m-0 mt-2 text-[34px] leading-none font-semibold tracking-[-0.03em]">{value}</p>
      {sub ? (
        <p className={cn("m-0 mt-1.5 text-xs", tone === "good" && "text-success", tone === "warn" && "text-warning", tone === "default" && "text-stone")}>
          {sub}
        </p>
      ) : null}
    </>
  );
  const cls = "bg-card ring-ink/8 block rounded-[14px] px-5 py-[18px] ring-1";
  return href ? (
    <Link href={href} className={cn(cls, "text-foreground hover:ring-gold no-underline transition-shadow")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** White panel with a 15px/600 title (or micro-label) and optional action. */
export function Panel({
  title,
  action,
  micro = false,
  children,
  className,
  id,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  /** Render the title as an 11px uppercase micro-label (detail panels). */
  micro?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("bg-card ring-ink/8 rounded-[14px] px-[22px] py-5 ring-1", className)}>
      {title ? (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={cn("m-0", micro ? "micro-label text-stone" : "text-[15px] font-semibold")}>{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={cn(title && "mt-3")}>{children}</div>
    </section>
  );
}

const LEAD_PILL: Record<string, string> = {
  new: "bg-[rgba(43,70,216,.1)] text-status-new",
  contacted: "bg-gold/18 text-gold-deep",
  qualified: "bg-[rgba(22,163,74,.12)] text-[#15803d]",
  signed: "bg-ink text-cream",
  rejected: "bg-ink/8 text-stone",
  spam: "bg-[rgba(220,38,38,.1)] text-[#b91c1c]",
};

/** Lead pipeline status pill (also used for related content statuses). */
export function LeadStatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold capitalize whitespace-nowrap",
        LEAD_PILL[status] ?? "bg-ink/8 text-stone",
        className,
      )}
    >
      {status}
    </span>
  );
}

/** Generic published/draft/etc pill for content lists. */
export function TonePill({
  tone,
  children,
  className,
}: {
  tone: "good" | "warn" | "bad" | "muted" | "ink";
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    good: "bg-[rgba(22,163,74,.12)] text-[#15803d]",
    warn: "bg-gold/18 text-gold-deep",
    bad: "bg-[rgba(220,38,38,.1)] text-[#b91c1c]",
    muted: "bg-ink/8 text-stone",
    ink: "bg-ink text-cream",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold whitespace-nowrap", map[tone], className)}>
      {children}
    </span>
  );
}

/** Small rounded filter pill rendered as a link (server-side filters). */
export function FilterPill({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-[34px] items-center rounded-full border px-3 text-xs font-semibold capitalize no-underline transition-colors",
        active ? "bg-ink border-ink text-cream" : "bg-card border-ink/14 text-foreground hover:border-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Button-like class helpers for the admin (ink / outline / ghost, 36–38px). */
export const adminBtn = {
  ink: "bg-ink text-cream hover:bg-ink-hover inline-flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-semibold no-underline transition-colors disabled:opacity-50",
  outline:
    "bg-card border-ink/14 hover:border-ink text-foreground inline-flex h-9 items-center gap-2 rounded-[9px] border px-3.5 text-[13px] font-semibold no-underline transition-colors disabled:opacity-50",
  ghost: "text-stone hover:text-foreground inline-flex h-9 items-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold no-underline",
  pill: "bg-card border-ink/14 hover:border-ink inline-flex h-[30px] items-center rounded-full border px-3 text-xs font-semibold no-underline transition-colors disabled:opacity-50",
};

/** Admin text input / select class (38px, radius 9, gold focus ring). */
export const adminInput =
  "bg-card border-ink/14 focus:border-gold focus:ring-gold/25 h-[38px] w-full rounded-[9px] border px-3 text-sm outline-none focus:ring-[3px]";
