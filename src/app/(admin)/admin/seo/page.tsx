import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Search,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { getContentHealth, type Severity } from "@/lib/data/content-health";
import { getWebAnalytics } from "@/lib/data/web-analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO" };

const SEV_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};
const SEV_TONE: Record<Severity, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export default async function SeoPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const [health, web] = await Promise.all([
    getContentHealth(supabase),
    getWebAnalytics(),
  ]);

  const totalPages =
    health.published.locationPages +
    health.published.counties +
    health.published.practiceAreas +
    health.published.blog;

  const groups: Severity[] = ["high", "medium", "low"];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        SEO command center
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Content health across every published page, plus your marketing data
        sources. The on-page checks run live against the database.
      </p>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Published pages" value={totalPages} hint="indexed content" />
        <Kpi
          label="Content issues"
          value={health.counts.total}
          hint={health.counts.total === 0 ? "all clear" : "need attention"}
        />
        <Kpi
          label="High priority"
          value={health.counts.high}
          tone={health.counts.high > 0 ? "destructive" : undefined}
        />
        <Kpi
          label="Visitors (30d)"
          value={web.configured && web.hasData ? web.visitors30 : "—"}
          hint={web.configured ? "from PostHog" : "PostHog not connected"}
        />
      </div>

      {/* Content health */}
      <h2 className="font-display mt-10 text-xl font-medium tracking-tight">
        Content health
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {health.published.locationPages} city × practice pages ·{" "}
        {health.published.counties} counties · {health.published.practiceAreas}{" "}
        practice areas · {health.published.blog} blog posts.
      </p>

      {health.counts.total === 0 ? (
        <Card className="border-success/40 bg-success/5 mt-4">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="text-success h-5 w-5" aria-hidden />
            <p className="text-sm">
              All published content passes the on-page checks — no missing or
              over-length metas, no thin copy, no drafts awaiting a local angle,
              nothing overdue for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((sev) => {
            const rows = health.issues.filter((i) => i.severity === sev);
            if (rows.length === 0) return null;
            return (
              <Card key={sev}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle
                      className={`h-4 w-4 ${SEV_TONE[sev]}`}
                      aria-hidden
                    />
                    {SEV_LABEL[sev]} priority ({rows.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-border divide-y">
                    {rows.map((i) => (
                      <li
                        key={`${i.entityId}-${i.issue}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <Link
                            href={i.editHref}
                            className="hover:text-primary font-medium underline-offset-4 hover:underline"
                          >
                            {i.label}
                          </Link>
                          <span className="text-muted-foreground block text-xs">
                            {i.issue}
                          </span>
                        </span>
                        <Link
                          href={i.editHref}
                          className="text-muted-foreground hover:text-primary flex-none text-xs"
                        >
                          Fix →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Data sources */}
      <h2 className="font-display mt-10 text-xl font-medium tracking-tight">
        Marketing data sources
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SourceCard
          icon={<Search className="h-4 w-4 text-primary" aria-hidden />}
          title="PostHog — site traffic"
          status={
            web.configured
              ? web.hasData
                ? "Connected"
                : "Connected · no pageviews yet"
              : "Not connected"
          }
          ok={web.configured}
        >
          {web.configured ? (
            <Link href="/admin/analytics" className="text-primary text-sm hover:underline">
              View traffic, funnel &amp; events in Analytics →
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">
              Set <Code>POSTHOG_PERSONAL_API_KEY</Code> and{" "}
              <Code>POSTHOG_PROJECT_ID</Code> to surface traffic here.
            </p>
          )}
        </SourceCard>

        <SourceCard
          icon={<FileSearch className="h-4 w-4 text-primary" aria-hidden />}
          title="Google Search Console"
          status="Not connected"
          ok={false}
        >
          <p className="text-muted-foreground text-sm">
            Connect a GSC service account to show clicks, impressions, and
            average position per page. Add the property in{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              rel="noopener"
              className="text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              Search Console <ExternalLink className="h-3 w-3" aria-hidden />
            </a>{" "}
            and submit the sitemap at <Code>/sitemap.xml</Code> first.
          </p>
        </SourceCard>

        <SourceCard
          icon={<Search className="h-4 w-4 text-primary" aria-hidden />}
          title="Semrush — rankings & authority"
          status="Manual"
          ok={false}
        >
          <p className="text-muted-foreground text-sm">
            Authority is the current ceiling — Semrush puts the firm at
            Authority Score ~7 vs. local competitors at 27. The link-building
            playbook lives in <Code>docs/citation-outreach-targets.md</Code> and{" "}
            <Code>docs/outreach-templates.md</Code>.
          </p>
        </SourceCard>

        <SourceCard
          icon={<ExternalLink className="h-4 w-4 text-primary" aria-hidden />}
          title="Sitemap & robots"
          status="Live"
          ok
        >
          <div className="flex flex-col gap-1 text-sm">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener"
              className="text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              /sitemap.xml <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener"
              className="text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              /robots.txt <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </SourceCard>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <span
          className={`font-display mt-1 block text-3xl font-medium tracking-tight ${
            tone === "destructive" ? "text-destructive" : ""
          }`}
        >
          {value}
        </span>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SourceCard({
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              ok ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"
            }`}
          >
            {status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-secondary rounded px-1 py-0.5 text-xs">{children}</code>
  );
}
