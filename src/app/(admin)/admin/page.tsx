import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, History } from "lucide-react";

import LeadsChart from "@/components/admin/leads-chart";
import { AdminPageHeader, LeadStatusPill, Panel, StatCard, adminBtn } from "@/components/admin/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { describeAuditAction } from "@/lib/admin/audit-label";
import { actorLabel } from "@/components/admin/content-history";
import { getLeadAnalytics } from "@/lib/data/lead-analytics";
import { getWebAnalytics } from "@/lib/data/web-analytics";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const supabase = await getServerSupabase();

  // Kick off the PostHog traffic query up front so it runs concurrently with
  // the Supabase lead queries below.
  const webPromise = getWebAnalytics();

  // 14-day trend for the at-a-glance sparkline (reuses the analytics
  // aggregator so the dashboard and Analytics page stay consistent).
  const analytics = await getLeadAnalytics(supabase, 14);

  // Lightweight queries — admin role bypasses public-only RLS via the
  // is_admin() policy on leads.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const staleIso = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: leads24h },
    { count: leads7d },
    signed30,
    total30,
    { count: dueCount },
    { count: unassignedNew },
    { count: tasksDue },
    { count: pendingTestimonials },
    { count: draftLocationPages },
    { count: stalePages },
    recent,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "signed")
      .gte("created_at", since30d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", nowIso)
      .not("status", "in", "(signed,rejected,spam)"),
    // Open intake not yet owned by anyone.
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .is("assigned_to", null),
    // Open tasks that are due now or overdue.
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("done", false)
      .not("due_at", "is", null)
      .lte("due_at", nowIso),
    // Testimonials awaiting attorney approval.
    supabase
      .from("testimonials")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false),
    // City × practice drafts with no local angle written yet.
    supabase
      .from("location_pages")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false)
      .is("local_angle_md", null),
    // Published pages overdue for their 12-month review.
    supabase
      .from("location_pages")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or(`last_reviewed_at.is.null,last_reviewed_at.lt.${staleIso}`),
    supabase
      .from("leads")
      .select("id, full_name, phone, county_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const conversion =
    total30.count && total30.count > 0
      ? Math.round(((signed30.count ?? 0) / total30.count) * 100)
      : null;

  const web = await webPromise;

  // Recent firm-wide activity (owner-only, like the full audit log).
  type Activity = { id: string; label: string; actor: string; ts: string };
  let activity: Activity[] = [];
  if (profile.role === "owner") {
    const { data: auditRows } = await supabase
      .from("audit_log")
      .select("id, actor_id, action, diff, ts")
      .order("ts", { ascending: false })
      .limit(12);
    const ids = [
      ...new Set((auditRows ?? []).map((r) => r.actor_id).filter(Boolean)),
    ] as string[];
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: admins } = await supabase
        .from("admin_profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      names = Object.fromEntries(
        (admins ?? []).map((a) => [a.user_id, a.full_name ?? "Admin"]),
      );
    }
    activity = (auditRows ?? []).map((r) => ({
      id: r.id as string,
      label: describeAuditAction(
        r.action as string,
        (r.diff as Record<string, unknown> | null) ?? null,
      ),
      actor: actorLabel(
        r.actor_id as string | null,
        (r.diff as Record<string, unknown> | null) ?? null,
        new Map(Object.entries(names)),
      ),
      ts: r.ts as string,
    }));
  }

  const [{ count: agentQuestions }, { count: draftsToReview }] = await Promise.all([
    supabase
      .from("agent_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("review_status", "needs_review"),
  ]);

  const attention: Array<{ label: string; href: string; count: number }> = [
    {
      label: "question(s) from the content agent",
      href: "/admin/content/agent#questions",
      count: agentQuestions ?? 0,
    },
    {
      label: "agent draft(s) awaiting your review",
      href: "/admin/content/blog?status=needs_review",
      count: draftsToReview ?? 0,
    },
    {
      label: "task(s) due or overdue",
      href: "/admin/today",
      count: tasksDue ?? 0,
    },
    {
      label: "follow-up(s) due",
      href: "/admin/leads?due=1",
      count: dueCount ?? 0,
    },
    {
      label: "unassigned new lead(s)",
      href: "/admin/leads?status=new&assignee=unassigned",
      count: unassignedNew ?? 0,
    },
    {
      label: "testimonial(s) awaiting approval",
      href: "/admin/content/testimonials",
      count: pendingTestimonials ?? 0,
    },
    {
      label: "city × practice draft(s) need a local angle",
      href: "/admin/content/location-pages?needs=angle",
      count: draftLocationPages ?? 0,
    },
    {
      label: "published page(s) overdue for review",
      href: "/admin/content/pages",
      count: stalePages ?? 0,
    },
  ].filter((a) => a.count > 0);

  const firstName = (profile.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const maxDaily = Math.max(1, ...analytics.daily.map((d) => d.count));

  return (
    <div>
      <AdminPageHeader
        eyebrow={today}
        title={`${greeting}, ${firstName}.`}
        actions={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/leads/next" className={adminBtn.ink}>
              <ArrowRight className="text-gold h-3.5 w-3.5" aria-hidden />
              Work next lead
            </a>
            <Link href="/admin/case-results" className={adminBtn.outline}>
              Add case result
            </Link>
          </>
        }
      />

      <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <StatCard label="New leads (24h)" value={leads24h ?? 0} sub={`${leads7d ?? 0} in the last 7 days`} href="/admin/leads?status=new" />
        <StatCard label="New leads (7d)" value={leads7d ?? 0} href="/admin/leads" />
        <StatCard
          label="Signed (30d)"
          value={signed30.count ?? 0}
          sub={total30.count ? `${total30.count} total leads` : null}
          tone="good"
          href="/admin/leads?status=signed"
        />
        <StatCard label="Conversion (30d)" value={conversion === null ? "—" : `${conversion}%`} href="/admin/analytics" />
      </div>

      <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-3.5">
        <Panel
          title="Leads — last 14 days"
          action={
            <Link href="/admin/analytics" className="text-gold-deep text-xs no-underline hover:underline">
              Full analytics →
            </Link>
          }
        >
          <div className="mt-2 flex h-[120px] items-end gap-1.5">
            {analytics.daily.map((d, i) => {
              const last = i === analytics.daily.length - 1;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count}`}
                  className={last ? "bg-gold flex-1 rounded-t-[5px] rounded-b-sm" : "bg-ink/12 flex-1 rounded-t-[5px] rounded-b-sm"}
                  style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }}
                />
              );
            })}
          </div>
          <div className="text-stone mt-2 flex justify-between text-[11px]">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
        </Panel>

        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              {attention.length > 0 ? (
                <AlertTriangle className="text-gold-deep h-[15px] w-[15px]" aria-hidden />
              ) : (
                <CheckCircle2 className="text-success h-[15px] w-[15px]" aria-hidden />
              )}
              Needs attention
            </span>
          }
        >
          {attention.length === 0 ? (
            <p className="text-stone text-sm">
              All clear — no follow-ups due, leads are assigned, and content is up to date.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {attention.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="hover:bg-paper text-foreground -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm no-underline transition-colors"
                  >
                    <span>
                      <strong className="font-bold">{a.count}</strong> <span className="text-stone">{a.label}</span>
                    </span>
                    <ArrowRight className="text-stone h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-3.5">
        <Panel
          title="Recent leads"
          action={
            <Link href="/admin/leads" className="text-gold-deep text-xs no-underline hover:underline">
              All leads →
            </Link>
          }
        >
          {recent.error ? (
            <p className="text-destructive text-sm">Couldn&apos;t load leads: {recent.error.message}</p>
          ) : !recent.data || recent.data.length === 0 ? (
            <p className="text-stone text-sm">
              No leads yet — once submissions come in via the public form they&apos;ll appear here.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {recent.data.slice(0, 8).map((l) => (
                <li key={l.id} className="border-ink/6 border-t">
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-foreground grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 text-sm no-underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{l.full_name}</span>
                      <span className="text-stone block text-xs">{l.phone}</span>
                    </span>
                    <LeadStatusPill status={l.status} />
                    <time dateTime={l.created_at} className="text-stone text-xs whitespace-nowrap">
                      {relativeTime(l.created_at, now)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {profile.role === "owner" ? (
          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                <History className="h-[15px] w-[15px]" aria-hidden />
                Recent activity
              </span>
            }
            action={
              <Link href="/admin/audit" className="text-gold-deep text-xs no-underline hover:underline">
                Full audit log →
              </Link>
            }
          >
            {activity.length === 0 ? (
              <p className="text-stone text-sm">No activity yet.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="border-ink/6 flex justify-between gap-3 border-t py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block">{a.label}</span>
                      <span className="text-stone block text-xs">{a.actor}</span>
                    </span>
                    <time dateTime={a.ts} className="text-stone flex-none text-xs whitespace-nowrap">
                      {relativeTime(a.ts, now)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>

      <Card className="mt-3.5">
        <CardHeader className="flex flex-row items-baseline justify-between gap-3">
          <CardTitle>Website traffic</CardTitle>
          {web.configured && web.hasData ? <span className="text-stone text-xs">last 30 days</span> : null}
        </CardHeader>
        <CardContent>
          {!web.configured ? (
            <div className="text-stone text-sm">
              <p>
                Traffic stats aren&apos;t connected yet. Set{" "}
                <code className="bg-paper rounded px-1 py-0.5 text-xs">POSTHOG_PERSONAL_API_KEY</code> and{" "}
                <code className="bg-paper rounded px-1 py-0.5 text-xs">POSTHOG_PROJECT_ID</code> in the environment to
                read pageviews and visitors from PostHog.
              </p>
            </div>
          ) : !web.hasData ? (
            <p className="text-stone text-sm">
              No pageviews recorded yet. Capture is already wired into the site — once it&apos;s live and receiving
              visitors, traffic shows up here.
            </p>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat label="Visitors (7d)" value={web.visitors7} />
                <MiniStat label="Pageviews (7d)" value={web.pageviews7} />
                <MiniStat label="Visitors (30d)" value={web.visitors30} />
                <MiniStat label="Pageviews (30d)" value={web.pageviews30} />
              </div>
              <div>
                <p className="micro-label text-stone mb-2">Pageviews — last 14 days</p>
                <LeadsChart data={web.daily} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <RankList title="Top pages" rows={web.topPages} />
                <RankList title="Top referrers" rows={web.topReferrers} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper rounded-[10px] p-4">
      <p className="micro-label text-stone m-0">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tracking-tight">
        {value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-[0.18em] uppercase">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No data.</p>
      ) : (
        <ul className="divide-border divide-y">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-foreground truncate" title={r.label}>
                {r.label}
              </span>
              <span className="text-muted-foreground flex-none font-medium">
                {r.count.toLocaleString("en-US")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
