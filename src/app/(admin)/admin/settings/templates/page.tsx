import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";

import TemplateManager, { type TemplateRow } from "./template-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Message templates" };

export default async function TemplatesPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("message_templates")
    .select("id, label, channel, subject, body, sort_order, is_active")
    .order("channel", { ascending: true })
    .order("sort_order", { ascending: true });

  const templates = (data ?? []) as TemplateRow[];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/settings"
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Settings
      </Link>
      <h1 className="font-display mt-3 text-2xl font-medium tracking-tight">
        Message templates
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Canned SMS and email replies for the lead Communications panel. The
        attorney always reviews and edits the message before it sends.
      </p>

      <div className="mt-6">
        <TemplateManager templates={templates} />
      </div>
    </div>
  );
}
