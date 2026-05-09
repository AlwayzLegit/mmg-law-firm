import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";

export default async function AdminSettingsPage() {
  const { user, profile } = await requireAdmin();

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
            <Row label="Name" value={profile.full_name ?? "—"} />
            <Row label="Email" value={user.email ?? "—"} />
            <Row label="Role" value={profile.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firm</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Legal name" value={FIRM.legalName} />
            <Row label="Phone" value={FIRM.phone} />
            <Row label="Email" value={FIRM.email} />
            <Row label="Address" value={FIRM_FULL_ADDRESS} />
            <Row label="CA Bar #" value={FIRM.barNumber} />
          </CardContent>
        </Card>
      </div>

      {/* TODO(group-e): invite-user flow (insert admin_profiles row, send
          magic-link via supabase.auth.admin.inviteUserByEmail). */}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
