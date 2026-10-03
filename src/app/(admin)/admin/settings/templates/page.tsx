import { AdminPageHeader } from "@/components/admin/ui";
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
    <div className="max-w-3xl">
      <AdminPageHeader
        eyebrow="Settings"
        title="Message templates"
        description="Canned SMS and email replies for the lead Communications panel. The attorney always reviews and edits the message before it sends."
      />

      <div className="mt-6">
        <TemplateManager templates={templates} />
      </div>
    </div>
  );
}
