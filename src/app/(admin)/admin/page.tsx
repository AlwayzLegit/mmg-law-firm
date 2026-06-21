import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import LeadsChart from "@/components/admin/leads-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadAnalytics } from "@/lib/data/lead-analytics";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await getServerSupabase();

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

  const attention: Array<{ label: string; href: string; count: number }> = [
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

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Dashboard
        </h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads (24h)" value={leads24h ?? 0} />
        <StatCard label="New leads (7d)" value={leads7d ?? 0} />
        <StatCard
          label="Signed (30d)"
          value={signed30.count ?? 0}
          sub={total30.count ? `${total30.count} total` : null}
        />
        <StatCard
          label="Conversion (30d)"
          value={conversion === null ? "—" : `${conversion}%`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {attention.length > 0 ? (
              <AlertTriangle className="text-warning h-4 w-4" aria-hidden />
            ) : (
              <CheckCircle2 className="text-success h-4 w-4" aria-hidden />
            )}
            Needs attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attention.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              All clear — no follow-ups due, leads are assigned, and content is
              up to date.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {attention.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="hover:bg-secondary/50 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-sm transition-colors"
                  >
                    <span>
                      <span className="text-foreground font-semibold">
                        {a.count}
                      </span>{" "}
                      <span className="text-muted-foreground">{a.label}</span>
                    </span>
                    <ArrowRight
                      className="text-muted-foreground h-3.5 w-3.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-baseline justify-between gap-3">
          <CardTitle className="text-base">Leads — last 14 days</CardTitle>
          <Link
            href="/admin/analytics"
            className="text-muted-foreground hover:text-primary text-xs"
          >
            Full analytics →
          </Link>
        </CardHeader>
        <CardContent>
          <LeadsChart data={analytics.daily} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent leads</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.error ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load leads: {recent.error.message}
            </p>
          ) : !recent.data || recent.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No leads yet — once submissions come in via the public form
              they&apos;ll appear here.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {recent.data.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="hover:text-primary font-medium"
                    >
                      {l.full_name}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {l.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-secondary rounded-md px-2 py-0.5 capitalize">
                      {l.status}
                    </span>
                    <time
                      dateTime={l.created_at}
                      className="text-muted-foreground"
                    >
                      {new Date(l.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string | null;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          {label}
        </p>
        <p className="font-display mt-2 text-3xl font-medium tracking-tight">
          {value}
        </p>
        {sub ? (
          <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
