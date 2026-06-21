import { FIRM } from "@/lib/constants";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { canonicalUrl } from "@/lib/seo/canonical";

export const dynamic = "force-static";

/**
 * /llms.txt — the emerging convention (llmstxt.org) that gives AI crawlers a
 * concise, curated map of the site. Markdown body, served as text/plain.
 * Static content only (firm constants + practice-area list + key hubs), so
 * it prerenders with no DB dependency.
 */
export function GET(): Response {
  const pa = PRACTICE_AREAS.slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(
      (p) =>
        `- [${p.name}](${canonicalUrl(`/practice-areas/${p.slug}`)}): California ${p.name.toLowerCase()} representation.`,
    )
    .join("\n");

  const body = `# ${FIRM.legalName}

> California personal-injury law firm led by ${FIRM.attorneyName} (CA State Bar #${FIRM.barNumber}), based in ${FIRM.address.city}, ${FIRM.address.state}. Free consultation, contingency fees (no fee unless we win), and bilingual representation (${FIRM.languages.join(", ")}). Attorney Advertising.

## Firm
- [Home](${canonicalUrl("/")}): Overview of the firm and how we help injured Californians.
- [About ${FIRM.attorneyName}](${canonicalUrl("/attorneys/mihran-ghazaryan")}): Attorney background, credentials, and approach.
- [Contact](${canonicalUrl("/contact")}): Free consultation request, phone ${FIRM.phone}, and office address.
- [Locations](${canonicalUrl("/locations")}): California counties and cities served from the ${FIRM.address.city} office.

## Practice areas
${pa}

## Notes
- Office: ${FIRM.address.street}, ${FIRM.address.city}, ${FIRM.address.state} ${FIRM.address.zip}. Hours: ${FIRM.hours}.
- This site is Attorney Advertising. Prior results do not guarantee a similar outcome. Contacting the firm does not create an attorney-client relationship.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
