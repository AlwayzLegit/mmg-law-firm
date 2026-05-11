import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { HOMEPAGE_FAQS } from "@/lib/data/faqs";
import { getFirmSettings } from "@/lib/data/firm-settings";

import EditForm from "./edit-form";

export default async function FirmSettingsPage() {
  await requireAdmin();
  const settings = await getFirmSettings();

  return (
    <div>
      <Link
        href="/admin/settings"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Settings
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Firm settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editable firm-level facts. The footer&apos;s &quot;Established YYYY&quot;
          line and the LegalService JSON-LD&apos;s sameAs URLs read from these
          values.
        </p>
      </div>

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
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Read-only firm data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Legal name" value={FIRM.legalName} />
            <Row label="Phone" value={FIRM.phone} />
            <Row label="Email" value={FIRM.email} />
            <Row label="Address" value={FIRM_FULL_ADDRESS} />
            <Row label="Hours" value={FIRM.hours} />
            <p className="mt-3 text-xs text-muted-foreground">
              These are managed in{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
                src/lib/constants.ts
              </code>{" "}
              — they&apos;re consumed synchronously by many surfaces (header,
              OG image, JSON-LD). Reach out to engineering to change them.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="break-words">{value}</span>
    </div>
  );
}
