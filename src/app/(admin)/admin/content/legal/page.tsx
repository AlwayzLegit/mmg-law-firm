import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const STALE_AFTER_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ContentLegalAdmin() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("legal_pages")
    .select(
      "id, slug, title, is_published, body_md, last_reviewed_at, effective_date, updated_at, display_order",
    )
    .order("display_order");

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const staleThreshold = now - STALE_AFTER_DAYS * DAY_MS;
  const stale = (data ?? []).filter(
    (p) =>
      p.is_published &&
      (!p.last_reviewed_at ||
        new Date(p.last_reviewed_at).getTime() < staleThreshold),
  );

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Legal pages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Privacy, disclaimer, CCPA notice, accessibility statement. Until a
          page is published with a non-empty body, the public URL renders the
          in-code template (a starting point — not attorney-reviewed copy).
        </p>
      </div>

      {stale.length > 0 ? (
        <Card className="mt-6 border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle
                className="h-4 w-4 text-warning"
                aria-hidden
              />
              Pages overdue for review
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              Spec §10.4 requires legal pages to be reviewed within 12 months
              to remain published. Open each row, confirm the content is
              current, and click <strong className="text-foreground">Mark reviewed</strong>.
            </p>
            <ul className="mt-3 grid gap-1">
              {stale.map((p) => (
                <li key={p.id} className="text-xs">
                  <Link
                    href={`/admin/content/legal/${p.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {p.title}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    {p.last_reviewed_at
                      ? `last reviewed ${new Date(p.last_reviewed_at).toLocaleDateString("en-US")}`
                      : "never reviewed"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Pages ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No legal pages in DB yet — apply migration{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
                0006_legal_pages.sql
              </code>{" "}
              to seed the canonical 4 rows.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((p) => {
                const hasBody = Boolean(p.body_md?.trim());
                const reviewed = p.last_reviewed_at
                  ? new Date(p.last_reviewed_at).toLocaleDateString("en-US")
                  : "Never";
                return (
                  <li key={p.id} className="py-3">
                    <Link
                      href={`/admin/content/legal/${p.id}`}
                      className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /legal/{p.slug}
                          {!hasBody ? " · using static fallback copy" : ""}
                          {" · "}reviewed {reviewed}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2 text-xs">
                        {!hasBody ? (
                          <span className="rounded-md bg-warning/10 px-2 py-0.5 font-medium text-warning">
                            Body empty
                          </span>
                        ) : null}
                        <span
                          className={`rounded-md px-2 py-0.5 font-medium ${
                            p.is_published
                              ? "bg-success/10 text-success"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {p.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
