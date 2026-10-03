import Link from "next/link";
import { CheckCircle2, ExternalLink, FileSearch, Search } from "lucide-react";

import {
  AdminPageHeader,
  EmptyNote,
  GridHead,
  GridRow,
  Panel,
  StatCard,
  TonePill,
  adminCode,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { getContentHealth, type Severity } from "@/lib/data/content-health";
import { getWebAnalytics } from "@/lib/data/web-analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO" };

const SEV_LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low" };
const SEV_TONE: Record<Severity, "bad" | "warn" | "muted"> = { high: "bad", medium: "warn", low: "muted" };

const ISSUE_COLS = "md:grid-cols-[88px_minmax(0,1.2fr)_minmax(0,1.6fr)_60px]";

export default async function SeoPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const [health, web] = await Promise.all([getContentHealth(supabase), getWebAnalytics()]);

  const totalPages =
    health.published.locationPages + health.published.counties + health.published.practiceAreas + health.published.blog;

  const groups: Severity[] = ["high", "medium", "low"];
  const ordered = groups.flatMap((sev) => health.issues.filter((i) => i.severity === sev));

  return (
    <div>
      <AdminPageHeader
        eyebrow="Search"
        title="SEO command center"
        description="Content health across every published page, plus your marketing data sources. The on-page checks run live against the database."
      />

      {/* KPIs */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published pages" value={totalPages} sub="indexed content" />
        <StatCard
          label="Content issues"
          value={health.counts.total}
          sub={health.counts.total === 0 ? "all clear" : "need attention"}
          tone={health.counts.total === 0 ? "good" : "warn"}
        />
        <StatCard
          label="High priority"
          value={<span className={health.counts.high > 0 ? "text-[#b91c1c]" : undefined}>{health.counts.high}</span>}
          sub={health.counts.high > 0 ? "fix first" : "none open"}
        />
        <StatCard
          label="Visitors (30d)"
          value={web.configured && web.hasData ? web.visitors30 : "—"}
          sub={web.configured ? "from PostHog" : "PostHog not connected"}
        />
      </div>

      {/* Content health */}
      <Panel
        className="mt-6"
        title="Content health"
        action={
          <span className="text-stone text-xs">
            {health.published.locationPages} city × practice · {health.published.counties} counties ·{" "}
            {health.published.practiceAreas} practice areas · {health.published.blog} blog posts
          </span>
        }
      >
        {health.counts.total === 0 ? (
          <div className="flex items-start gap-3 rounded-[10px] bg-[rgba(22,163,74,.08)] p-4 text-[13px]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#15803d]" aria-hidden />
            <p className="m-0">
              All published content passes the on-page checks — no missing or over-length metas, no thin copy, no drafts
              awaiting a local angle, nothing overdue for review.
            </p>
          </div>
        ) : (
          <div className="-mx-4">
            <GridHead cols={ISSUE_COLS}>
              <span>Priority</span>
              <span>Page</span>
              <span>Issue</span>
              <span />
            </GridHead>
            {ordered.map((i) => (
              <GridRow key={`${i.entityId}-${i.issue}`} cols={ISSUE_COLS} href={i.editHref}>
                <span>
                  <TonePill tone={SEV_TONE[i.severity]}>{SEV_LABEL[i.severity]}</TonePill>
                </span>
                <span className="min-w-0 truncate font-semibold">{i.label}</span>
                <span className="text-stone min-w-0">{i.issue}</span>
                <span className="text-gold-deep text-right text-xs font-semibold">Fix →</span>
              </GridRow>
            ))}
          </div>
        )}
      </Panel>

      {/* Data sources */}
      <h2 className="font-display mt-10 text-[22px] leading-tight font-semibold tracking-[-0.02em]">Marketing data sources</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SourcePanel
          icon={<Search className="h-4 w-4" aria-hidden />}
          title="PostHog — site traffic"
          status={web.configured ? (web.hasData ? "Connected" : "Connected · no pageviews yet") : "Not connected"}
          ok={web.configured}
        >
          {web.configured ? (
            <Link href="/admin/analytics" className="text-gold-deep text-[13px] font-semibold no-underline hover:underline">
              View traffic, funnel &amp; events in Analytics →
            </Link>
          ) : (
            <EmptyNote>
              Set <code className={adminCode}>POSTHOG_PERSONAL_API_KEY</code> and <code className={adminCode}>POSTHOG_PROJECT_ID</code>{" "}
              to surface traffic here.
            </EmptyNote>
          )}
        </SourcePanel>

        <SourcePanel icon={<FileSearch className="h-4 w-4" aria-hidden />} title="Google Search Console" status="Not connected" ok={false}>
          <EmptyNote>
            Connect a GSC service account to show clicks, impressions, and average position per page. Add the property in{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener"
              className="text-gold-deep inline-flex items-center gap-0.5 font-semibold no-underline hover:underline"
            >
              Search Console <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{" "}
            and submit the sitemap at <code className={adminCode}>/sitemap.xml</code> first.
          </EmptyNote>
        </SourcePanel>

        <SourcePanel icon={<Search className="h-4 w-4" aria-hidden />} title="Semrush — rankings & authority" status="Manual" ok={false}>
          <EmptyNote>
            Authority is the current ceiling — Semrush puts the firm at Authority Score ~7 vs. local competitors at 27. The
            link-building playbook lives in <code className={adminCode}>docs/citation-outreach-targets.md</code> and{" "}
            <code className={adminCode}>docs/outreach-templates.md</code>.
          </EmptyNote>
        </SourcePanel>

        <SourcePanel icon={<ExternalLink className="h-4 w-4" aria-hidden />} title="Sitemap & robots" status="Live" ok>
          <div className="flex flex-col gap-1 text-[13px]">
            <a href="/sitemap.xml" target="_blank" rel="noopener" className="text-gold-deep inline-flex items-center gap-1 font-semibold no-underline hover:underline">
              /sitemap.xml <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <a href="/robots.txt" target="_blank" rel="noopener" className="text-gold-deep inline-flex items-center gap-1 font-semibold no-underline hover:underline">
              /robots.txt <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </SourcePanel>
      </div>
    </div>
  );
}

function SourcePanel({
  icon,
  title,
  status,
  ok,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <span className="bg-ink text-gold inline-flex h-7 w-7 items-center justify-center rounded-[8px]">{icon}</span>
          {title}
        </span>
      }
      action={<TonePill tone={ok ? "good" : "muted"}>{status}</TonePill>}
    >
      {children}
    </Panel>
  );
}
