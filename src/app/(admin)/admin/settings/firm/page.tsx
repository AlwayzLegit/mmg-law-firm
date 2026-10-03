import { AdminPageHeader, Panel, adminCode } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { HOMEPAGE_FAQS } from "@/lib/data/faqs";
import { getFirmSettings, getFirmStats } from "@/lib/data/firm-settings";

import EditForm from "./edit-form";

export default async function FirmSettingsPage() {
  await requireAdmin();
  const [settings, stats] = await Promise.all([
    getFirmSettings(),
    getFirmStats(),
  ]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Settings"
        title="Firm settings"
        description="Editable firm-level facts. The footer's “Established YYYY” line and the LegalService JSON-LD's sameAs URLs read from these values."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          founded_year={settings.founded_year?.toString() ?? ""}
          yelp_url={settings.yelp_url ?? ""}
          super_lawyers_url={settings.super_lawyers_url ?? ""}
          homepage_faqs={
            settings.homepage_faqs.length > 0
              ? settings.homepage_faqs
              : HOMEPAGE_FAQS
          }
          fallbackFaqs={HOMEPAGE_FAQS}
          years_practicing={stats.years_practicing?.toString() ?? ""}
          settlements_total_display={stats.settlements_total_display ?? ""}
          cases_handled_display={stats.cases_handled_display ?? ""}
          consultations_display={stats.consultations_display ?? ""}
        />

        <Panel title="Read-only firm data" className="self-start">
          <div className="grid gap-2 text-[13px]">
            <Row label="Legal name" value={FIRM.legalName} />
            <Row label="Phone" value={FIRM.phone} />
            <Row label="Email" value={FIRM.email} />
            <Row label="Address" value={FIRM_FULL_ADDRESS} />
            <Row label="Hours" value={FIRM.hours} />
            <p className="text-stone m-0 mt-3 text-xs">
              These are managed in <code className={adminCode}>src/lib/constants.ts</code> — they&apos;re consumed synchronously by
              many surfaces (header, OG image, JSON-LD). Reach out to engineering to change them.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="micro-label text-stone">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  );
}
