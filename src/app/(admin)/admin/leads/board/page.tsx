import Link from "next/link";
import { List } from "lucide-react";

import { AdminPageHeader, FilterPill, adminBtn } from "@/components/admin/ui";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getTagVocabulary } from "@/lib/data/lead-tags";
import { getServerSupabase } from "@/lib/supabase/server";

import KanbanBoard, { type KanbanCard } from "./kanban-board";

// Cap the board so a busy pipeline stays responsive — the most recent
// 400 open/closed leads across the five tracked columns. Spam is excluded;
// review it from the list's spam filter.
const BOARD_LIMIT = 400;

export const metadata = {
  title: "Leads board",
  robots: { index: false, follow: false },
};

type SearchParams = { assignee?: string; tag?: string };

export default async function LeadsBoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mine = params.assignee === "me";
  const tag = (params.tag ?? "").trim().toLowerCase().slice(0, 30);

  const { user } = await requireAdmin();
  const supabase = await getServerSupabase();

  let leadsQuery = supabase
    .from("leads")
    .select(
      "id, full_name, phone, status, created_at, follow_up_at, assigned_to, tags",
    )
    .in("status", ["new", "contacted", "qualified", "signed", "rejected"]);
  if (mine) leadsQuery = leadsQuery.eq("assigned_to", user.id);
  if (tag) leadsQuery = leadsQuery.contains("tags", [tag]);

  const [{ data, error }, { data: adminRows }, tagSuggestions] =
    await Promise.all([
      leadsQuery.order("created_at", { ascending: false }).limit(BOARD_LIMIT),
      supabase.from("admin_profiles").select("user_id, full_name, role"),
      getTagVocabulary(supabase),
    ]);

  // Map assignee ids to short labels for the card chips.
  const assigneeNames: Record<string, string> = {};
  for (const a of adminRows ?? []) {
    assigneeNames[a.user_id as string] =
      (a.full_name as string | null) ?? (a.role as string);
  }

  const cards = (data ?? []) as KanbanCard[];

  // Assignee toggle hrefs preserve the active tag.
  const assigneeHref = (target: "all" | "me") => {
    const sp = new URLSearchParams();
    if (target === "me") sp.set("assignee", "me");
    if (tag) sp.set("tag", tag);
    const qs = sp.toString();
    return `/admin/leads/board${qs ? `?${qs}` : ""}`;
  };
  const clearTagHref = mine
    ? "/admin/leads/board?assignee=me"
    : "/admin/leads/board";

  return (
    <div>
      <AdminPageHeader
        eyebrow="Pipeline"
        title="Leads board"
        description={`Drag a card between columns to change its status, or use the picker on each card. Showing up to ${BOARD_LIMIT} non-spam leads.`}
        actions={
          <Link href="/admin/leads" className={adminBtn.outline}>
            <List className="h-3.5 w-3.5" aria-hidden />
            List view
          </Link>
        }
      />

      <nav className="mt-5 flex flex-wrap items-center gap-2" aria-label="Filter board">
        <span className="micro-label text-stone mr-1">Assignee</span>
        {(["all", "me"] as const).map((opt) => (
          <FilterPill key={opt} href={assigneeHref(opt)} active={(opt === "me") === mine}>
            {opt === "all" ? "Anyone" : "Mine"}
          </FilterPill>
        ))}
        {tag ? (
          <span className="bg-gold/18 text-gold-deep ml-1 inline-flex h-[34px] items-center gap-2 rounded-full px-3 text-xs font-semibold">
            Tag: {tag}
            <Link href={clearTagHref} aria-label="Clear tag filter" className="text-gold-deep no-underline hover:text-foreground">
              ✕
            </Link>
          </span>
        ) : null}
      </nav>

      {error ? (
        <p className="mt-6 text-[13px] text-[#b91c1c]">{error.message}</p>
      ) : (
        <div className="mt-6">
          <KanbanBoard
            cards={cards}
            assigneeNames={assigneeNames}
            tagSuggestions={tagSuggestions}
          />
        </div>
      )}
    </div>
  );
}
