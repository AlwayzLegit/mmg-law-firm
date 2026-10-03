import type { FirmBadge } from "@/lib/data/firm-settings";

import { BadgesPanel } from "./badges-panel";
import { CaseResultsSection, type CaseResult } from "./case-result-card";
import { TestimonialsSection, type Testimonial } from "./testimonial-card";

/**
 * Homepage "Results / Reviews / Badges" block. Each part renders only when
 * the admin has published rows for it; when all three are empty the block
 * is omitted entirely (no dashed frames on the live site).
 */
export function TrustBlock({
  results,
  testimonials,
  badges,
}: {
  results: CaseResult[];
  testimonials: Testimonial[];
  badges: FirmBadge[];
}) {
  if (results.length === 0 && testimonials.length === 0 && badges.length === 0) return null;
  return (
    <section className="bg-background text-foreground border-line border-t">
      <div className="container-page section-pad-sm grid gap-12">
        <CaseResultsSection results={results} embedded />
        <TestimonialsSection testimonials={testimonials} embedded />
        <BadgesPanel badges={badges} />
      </div>
    </section>
  );
}
