import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseSettings } from "@/lib/content-agent/settings";
import { getServerSupabase } from "@/lib/supabase/server";

import InstructionsForm from "./instructions-form";

export const dynamic = "force-dynamic";

export default async function InstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>;
}) {
  await requireAdmin();
  const { version } = await searchParams;
  const supabase = await getServerSupabase();
  const { data: versions } = await supabase
    .from("agent_instructions")
    .select("id, version, change_note, created_at, created_by")
    .order("version", { ascending: false })
    .limit(30);
  const list = (versions ?? []) as Array<{ id: string; version: number; change_note: string | null; created_at: string; created_by: string | null }>;
  const wanted = version ? Number(version) : list[0]?.version;
  const { data: row } = wanted
    ? await supabase.from("agent_instructions").select("version, body_md, settings").eq("version", wanted).maybeSingle()
    : { data: null };
  const current = row as { version: number; body_md: string; settings: unknown } | null;

  const ids = [...new Set(list.map((v) => v.created_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: admins } = await supabase.from("admin_profiles").select("user_id, full_name").in("user_id", ids);
    for (const a of (admins ?? []) as Array<{ user_id: string; full_name: string | null }>) names.set(a.user_id, a.full_name ?? "Admin");
  }

  return (
    <div>
      <Link href="/admin/content/agent" className="text-muted-foreground hover:text-primary text-sm">
        ← Content agent
      </Link>
      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">Agent instructions</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The editorial brief the agent reads at the start of every run. Versioned: each publish is a new version; older ones stay for the record.
          {current && list[0] && current.version !== list[0].version ? (
            <span className="text-warning"> You are viewing v{current.version}; publishing creates a new version from it.</span>
          ) : null}
        </p>
      </div>

      <div className="mt-6">
        <InstructionsForm
          version={list[0]?.version ?? null}
          body_md={current?.body_md ?? ""}
          settings={parseSettings(current?.settings)}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground text-sm">No versions yet — run the 0031 migration to seed the defaults.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {list.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <Link href={`/admin/content/agent/instructions?version=${v.version}`} className={`hover:text-primary font-medium ${current?.version === v.version ? "text-primary" : ""}`}>
                      v{v.version}
                    </Link>
                    <span className="text-muted-foreground"> · {v.change_note ?? "—"} · {v.created_by ? names.get(v.created_by) ?? "Admin" : "System"}</span>
                  </span>
                  <time className="text-muted-foreground flex-none text-xs" dateTime={v.created_at}>{new Date(v.created_at).toLocaleString("en-US")}</time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
