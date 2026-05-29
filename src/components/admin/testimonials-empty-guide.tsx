import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import {
  TestimonialCard,
  type Testimonial,
} from "@/components/marketing/testimonial-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_PREVIEW: Testimonial = {
  id: "sample",
  quote:
    "After my accident I didn't know where to start. Mihran walked me through every step, answered every call, and got me a settlement that actually covered my medical bills. Couldn't recommend him more.",
  initials: "A. K.",
  city: "Glendale",
  rating: 5,
  practiceArea: "Car Accidents",
};

export function TestimonialsEmptyGuide() {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Add your first testimonial
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <div>
          <p className="text-sm text-muted-foreground">
            Each approved testimonial renders on the homepage and at{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              /reviews
            </code>
            . Here&apos;s how an approved row looks.
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Preview · sample data
          </p>
          <div className="mt-3 rounded-2xl bg-secondary/40 p-4">
            <div className="pointer-events-none">
              <TestimonialCard testimonial={SAMPLE_PREVIEW} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Section title="What you'll enter">
            <FieldRow
              name="Client initials"
              required
              hint="Never full names — “A. K.” not “Ani Karapetian”"
            />
            <FieldRow name="Quote" required hint="Verbatim, up to ~2k chars" />
            <FieldRow name="Rating" hint="1–5; defaults to 5 stars" />
            <FieldRow name="City" hint="Optional venue tag" />
            <FieldRow name="Practice area" hint="Optional, links the card" />
            <FieldRow name="Source" hint="e.g. Google, Yelp, intake form" />
          </Section>

          <Section
            title="Compliance — CRPC §7.1"
            tone="warn"
            icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
          >
            <RuleRow>
              Use initials only — full names trigger identifiability concerns
            </RuleRow>
            <RuleRow>
              Get the client&apos;s written consent before publishing their
              words
            </RuleRow>
            <RuleRow>
              No comparative or guarantee language; the proximity disclaimer
              renders automatically
            </RuleRow>
          </Section>

          <p className="text-xs text-muted-foreground">
            Click <strong>New testimonial</strong> above to start. Nothing
            shows publicly until you flip <em>Approved</em>.
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
