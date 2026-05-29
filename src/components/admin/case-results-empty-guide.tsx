import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import {
  CaseResultCard,
  type CaseResult,
} from "@/components/marketing/case-result-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_PREVIEW: CaseResult = {
  id: "sample",
  headline:
    "$1.2M settlement — pedestrian struck in marked crosswalk, multi-trauma",
  amountDisplay: "$1.2 million",
  practiceArea: "Pedestrian Accidents",
  county: "Los Angeles",
  year: 2024,
  summary:
    "Client crossing within a marked crosswalk was struck by a distracted driver. Pre-litigation negotiation broke down after the insurer disputed liability despite traffic-cam footage. Filed suit; produced the footage in early discovery and deposed the at-fault driver. Settlement reached at mediation covered all medical liens and lost income.",
};

export function CaseResultsEmptyGuide() {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Add your first case result
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <div>
          <p className="text-sm text-muted-foreground">
            Each row renders as a card on the homepage and on{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              /case-results
            </code>
            . Here&apos;s how a published row looks — use it as the shape for
            your first entry.
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Preview · sample data
          </p>
          <div className="mt-3 rounded-2xl bg-secondary/40 p-4">
            <div className="pointer-events-none">
              <CaseResultCard result={SAMPLE_PREVIEW} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Section title="What you'll enter">
            <FieldRow name="Headline" required hint="Up to 220 chars" />
            <FieldRow
              name="Amount (display)"
              hint="What renders large, e.g. “$1.2 million”"
            />
            <FieldRow
              name="Amount (cents)"
              hint="Optional, used for sorting later"
            />
            <FieldRow name="Practice area" hint="From your list" />
            <FieldRow name="County" hint="Optional venue tag" />
            <FieldRow name="Year" hint="Optional" />
            <FieldRow
              name="Anonymized summary"
              required
              hint="Up to ~20k chars, markdown"
            />
          </Section>

          <Section
            title="Compliance — CRPC §7.1"
            tone="warn"
            icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
          >
            <RuleRow>Never identify the client by name or distinctive fact</RuleRow>
            <RuleRow>
              Avoid promising results in similar matters — the past-results
              disclaimer renders automatically in proximity
            </RuleRow>
            <RuleRow>
              Use anonymized treatment descriptions, not medical records
            </RuleRow>
          </Section>

          <p className="text-xs text-muted-foreground">
            Click <strong>New result</strong> above to start. You can save a
            draft first; nothing publishes until you flip{" "}
            <em>Publish</em> on the edit page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone?: "warn";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
          tone === "warn" ? "text-[var(--color-gold-700,#a98442)]" : "text-primary"
        }`}
      >
        {icon}
        <span>{title}</span>
      </p>
      <ul className="mt-2 grid gap-1.5">{children}</ul>
    </div>
  );
}

function FieldRow({
  name,
  required,
  hint,
}: {
  name: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <li className="flex items-baseline gap-3 text-xs">
      <span className="font-medium text-foreground">
        {name}
        {required ? (
          <span className="ml-1 text-destructive" aria-label="required">
            *
          </span>
        ) : null}
      </span>
      {hint ? <span className="text-muted-foreground">{hint}</span> : null}
    </li>
  );
}

function RuleRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs text-muted-foreground">
      <CheckCircle2
        className="mt-px h-3.5 w-3.5 flex-none text-[var(--color-gold-700,#a98442)]"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}
