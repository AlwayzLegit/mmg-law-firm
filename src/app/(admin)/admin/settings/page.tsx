import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    supabase
      .from("admin_profiles")
      .select("user_id, role, full_name, created_at")
      .order("created_at", { ascending: true }),
    getFirmSettings(),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Settings
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <DisplayNameForm current={profile.full_name ?? ""} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="Role" value={profile.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between text-base">
              <span>Firm</span>
              <Link
                href="/admin/settings/firm"
                className="text-primary text-xs font-normal hover:underline"
              >
                Edit →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Legal name" value={FIRM.legalName} />
            <Row label="Phone" value={FIRM.phone} />
            <Row label="Email" value={FIRM.email} />
            <Row label="Address" value={FIRM_FULL_ADDRESS} />
            <Row label="CA Bar #" value={FIRM.barNumber} />
            <Row
              label="Founded"
              value={settings.founded_year?.toString() ?? "—"}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SecurityCard />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            {admins && admins.length > 0 ? (
              <ul className="divide-border divide-y">
                {admins.map((a) => (
                  <li
                    key={a.user_id}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {a.full_name ?? "(no name)"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Joined{" "}
                        {new Date(a.created_at).toLocaleDateString("en-US")}
                      </p>
                    </div>
                    {profile.role === "owner" ? (
                      <AdminRowActions
                        userId={a.user_id}
                        role={a.role}
                        isSelf={a.user_id === user.id}
                      />
                    ) : (
                      <span className="bg-secondary rounded-md px-2 py-0.5 text-xs font-medium capitalize">
                        {a.role}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No admins recorded.
              </p>
            )}
          </CardContent>
        </Card>

        {profile.role === "owner" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite a new admin</CardTitle>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inviting admins</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Only owners can invite new admins. Ask the firm owner if you need
              access added.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
      <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
