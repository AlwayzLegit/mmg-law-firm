import Link from "next/link";

import { AdminPageHeader, Avatar, EmptyNote, Panel, TonePill, adminBtn } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getFirmSettings } from "@/lib/data/firm-settings";
import { getServerSupabase } from "@/lib/supabase/server";

import AdminRowActions from "./admin-row-actions";
import DisplayNameForm from "./display-name-form";
import InviteForm from "./invite-form";
import SecurityCard from "./security-card";

export default async function AdminSettingsPage() {
  const { user, profile } = await requireAdmin();
  const supabase = await getServerSupabase();
  const [{ data: admins }, settings] = await Promise.all([
    supabase.from("admin_profiles").select("user_id, role, full_name, created_at").order("created_at", { ascending: true }),
    getFirmSettings(),
  ]);

  return (
    <div>
      <AdminPageHeader eyebrow="Settings" title="Team & security" description="Your account, who can sign in, and how they prove it." />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Your account">
          <div className="grid gap-2 text-[13px]">
            <DisplayNameForm current={profile.full_name ?? ""} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="Role" value={profile.role} />
          </div>
        </Panel>

        <Panel
          title="Firm"
          action={
            <Link href="/admin/settings/firm" className="text-gold-deep text-xs font-semibold no-underline hover:underline">
              Edit →
            </Link>
          }
        >
          <div className="grid gap-2 text-[13px]">
            <Row label="Legal name" value={FIRM.legalName} />
            <Row label="Phone" value={FIRM.phone} />
            <Row label="Email" value={FIRM.email} />
            <Row label="Address" value={FIRM_FULL_ADDRESS} />
            <Row label="CA Bar #" value={FIRM.barNumber} />
            <Row label="Founded" value={settings.founded_year?.toString() ?? "—"} />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SecurityCard />
        <div className="grid gap-6">
          {profile.role === "owner" ? (
            <Panel title="API keys">
              <EmptyNote>
                Scoped bearer tokens for the admin API — the content agent, n8n, scripts. Each key has its own scopes, rate limit and
                audit trail.
              </EmptyNote>
              <Link href="/admin/settings/api-keys" className={`${adminBtn.outline} mt-3`}>
                Manage API keys
              </Link>
            </Panel>
          ) : null}
          <Panel title="Communications">
            <EmptyNote>Manage the canned SMS and email templates used in the lead Communications panel.</EmptyNote>
            <Link href="/admin/settings/templates" className={`${adminBtn.outline} mt-3`}>
              Edit message templates
            </Link>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Admins">
          {admins && admins.length > 0 ? (
            <ul className="divide-line m-0 list-none divide-y p-0">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.full_name ?? "?"} size={34} />
                    <div className="min-w-0">
                      <p className="m-0 truncate font-semibold">{a.full_name ?? "(no name)"}</p>
                      <p className="text-stone m-0 text-xs">Joined {new Date(a.created_at).toLocaleDateString("en-US")}</p>
                    </div>
                  </div>
                  {profile.role === "owner" ? (
                    <AdminRowActions userId={a.user_id} role={a.role} isSelf={a.user_id === user.id} />
                  ) : (
                    <TonePill tone={a.role === "owner" ? "ink" : "muted"} className="capitalize">
                      {a.role}
                    </TonePill>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No admins recorded.</EmptyNote>
          )}
        </Panel>

        {profile.role === "owner" ? (
          <Panel title="Invite a new admin">
            <InviteForm />
          </Panel>
        ) : (
          <Panel title="Inviting admins">
            <EmptyNote>Only owners can invite new admins. Ask the firm owner if you need access added.</EmptyNote>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
      <span className="micro-label text-stone">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  );
}
