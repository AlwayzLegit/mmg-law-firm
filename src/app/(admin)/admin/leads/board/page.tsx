import Link from "next/link";
import { List } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
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

  const [{ data, error }, { data: adminRows }] = await Promise.all([
    leadsQuery.order("created_at", { ascending: false }).limit(BOARD_LIMIT),
    supabase.from("admin_profiles").select("user_id, full_name, role"),
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
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Leads board
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Drag a card between columns to change its status, or use the picker
            on each card. Showing up to {BOARD_LIMIT} non-spam leads.
          </p>
        </div>
        <Link
          href="/admin/leads"
          className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          <List className="h-3.5 w-3.5" aria-hidden />
          List view
        </Link>
      </div>

      <nav
        className="mt-4 flex flex-wrap items-center gap-2"
        aria-label="Filter board"
      >
        <span className="text-muted-foreground text-xs">Assignee:</span>
        {(["all", "me"] as const).map((opt) => (
          <Link
            key={opt}
            href={assigneeHref(opt)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              (opt === "me") === mine
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            {opt === "all" ? "Anyone" : "Mine"}
          </Link>
        ))}
        {tag ? (
          <span className="border-primary/30 bg-primary/10 text-primary ml-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            Tag: {tag}
            <Link
              href={clearTagHref}
              aria-label="Clear tag filter"
              className="hover:text-primary/70"
            >
              ✕
            </Link>
          </span>
        ) : null}
      </nav>

      {error ? (
        <p className="text-destructive mt-6 text-sm">{error.message}</p>
      ) : (
        <div className="mt-6">
          <KanbanBoard cards={cards} assigneeNames={assigneeNames} />
        </div>
      )}
    </div>
  );
}
