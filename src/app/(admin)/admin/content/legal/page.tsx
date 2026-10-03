import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { AdminPageHeader, EmptyNote, GridHead, GridRow, Panel, TonePill, adminCode } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

const STALE_AFTER_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const COLS = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_110px_96px]";

export default async function ContentLegalAdmin() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("legal_pages")
    .select("id, slug, title, is_published, body_md, last_reviewed_at, effective_date, updated_at, display_order")
    .order("display_order");

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const staleThreshold = now - STALE_AFTER_DAYS * DAY_MS;
  const isStale = (p: { is_published: boolean; last_reviewed_at: string | null }) =>
    p.is_published && (!p.last_reviewed_at || new Date(p.last_reviewed_at).getTime() < staleThreshold);
  const stale = (data ?? []).filter(isStale);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Legal pages"
        description="Privacy, disclaimer, CCPA notice, accessibility statement. Until a page is published with a non-empty body, the public URL renders the in-code template (a starting point — not attorney-reviewed copy)."
      />

      {stale.length > 0 ? (
        <Panel
          className="mt-6 ring-gold/50"
          title={
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="text-gold-deep h-4 w-4" aria-hidden />
              Pages overdue for review
            </span>
          }
        >
          <p className="text-stone m-0 text-[13px]">
            Spec §10.4 requires legal pages to be reviewed within 12 months to remain published. Open each row, confirm the content
            is current, and click <strong className="text-foreground">Mark reviewed</strong>.
          </p>
          <ul className="m-0 mt-3 grid list-none gap-1 p-0">
            {stale.map((p) => (
              <li key={p.id} className="text-xs">
                <Link href={`/admin/content/legal/${p.id}`} className="text-foreground hover:text-gold-deep font-semibold no-underline">
                  {p.title}
                </Link>{" "}
                <span className="text-stone">
                  {p.last_reviewed_at ? `last reviewed ${new Date(p.last_reviewed_at).toLocaleDateString("en-US")}` : "never reviewed"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mt-6" title={`Pages (${data?.length ?? 0})`}>
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : !data || data.length === 0 ? (
          <EmptyNote>
            No legal pages in DB yet — apply migration <code className={adminCode}>0006_legal_pages.sql</code> to seed the canonical 4
            rows.
          </EmptyNote>
        ) : (
          <div className="-mx-4">
            <GridHead cols={COLS}>
              <span>Title</span>
              <span>Path</span>
              <span>Copy</span>
              <span>Status</span>
              <span>Reviewed</span>
            </GridHead>
            {data.map((p) => {
              const hasBody = Boolean(p.body_md?.trim());
              const reviewed = p.last_reviewed_at ? new Date(p.last_reviewed_at).toLocaleDateString("en-US") : "Never";
              return (
                <GridRow key={p.id} cols={COLS} href={`/admin/content/legal/${p.id}`}>
                  <span className="min-w-0 truncate font-semibold">{p.title}</span>
                  <span className="text-stone min-w-0 truncate font-mono text-xs">/legal/{p.slug}</span>
                  <span>{hasBody ? <TonePill tone="good">Body set</TonePill> : <TonePill tone="warn">Fallback copy</TonePill>}</span>
                  <span>
                    <TonePill tone={p.is_published ? "ink" : "muted"}>{p.is_published ? "Published" : "Draft"}</TonePill>
                  </span>
                  <span className={isStale(p) ? "text-gold-deep text-xs font-semibold" : "text-stone text-xs"}>{reviewed}</span>
                </GridRow>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
