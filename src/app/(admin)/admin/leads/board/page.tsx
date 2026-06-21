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

export default async function LeadsBoardPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();

  const [{ data, error }, { data: adminRows }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, full_name, phone, status, created_at, follow_up_at, assigned_to",
      )
      .in("status", ["new", "contacted", "qualified", "signed", "rejected"])
      .order("created_at", { ascending: false })
      .limit(BOARD_LIMIT),
    supabase.from("admin_profiles").select("user_id, full_name, role"),
  ]);

  // Map assignee ids to short labels for the card chips.
  const assigneeNames: Record<string, string> = {};
  for (const a of adminRows ?? []) {
    assigneeNames[a.user_id as string] =
      (a.full_name as string | null) ?? (a.role as string);
  }

  const cards = (data ?? []) as KanbanCard[];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Leads board
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Drag a card between columns to change its status, or use the picker
            on each card. Showing the {BOARD_LIMIT} most recent non-spam leads.
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
