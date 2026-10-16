import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MOTORCYCLE_CITY_COPY_REVISION, sharedContentRevision } from "../seo/content-revisions";
import { INJURY_DEADLINE_NOTE, TRUCK_EVIDENCE_EXPLANATION } from "./approved-accident-copy";

vi.mock("@/lib/data/queries", () => ({
  getLocationPage: async (_county: string, _city: string, slug: string) => ({
    county_slug: "monterey-county", county_name: "Monterey County",
    city_slug: "salinas", city_name: "Salinas", practice_area_slug: slug,
    practice_area_name: "Motorcycle Accidents", local_angle_md: "Unique local control paragraph.",
    intro_md: "Unchanged introduction.", meta_description: "Frozen description.", faq_json: [],
  }),
  getPublishedLocationPages: async () => [],
}));
// Keep the real page, Markdown, subtopic, checklist and attorney-help rendering.
// Form delivery and hero media are outside this editorial regression test.
vi.mock("@/components/marketing/lead-form", () => ({ LeadForm: () => null }));
vi.mock("@/components/marketing/attorney-hero-aside", () => ({ AttorneyHeroAside: () => null }));
import CityPracticePage from "@/app/(marketing)/locations/[county]/[city]/[practiceArea]/page";

const replacements = [
  ["Photograph the bike, your gear, and the scene before anything moves.", "Once you are safe and urgent medical needs are addressed, photograph the bike, gear and scene if you can do so safely. Do not delay emergency assistance or necessary movement to safety to take photographs."],
  ["California lane-splitting is legal — but reasonable. We document compliance with CHP guidelines to defeat shared-fault claims.", "Lane-splitting is legal in California, but responsibility for a collision depends on the circumstances. We review the available evidence, including speed, visibility and vehicle movements, when evaluating a shared-fault allegation."],
  ["Government-entity claims have a six-month presentation deadline.", "An injury claim involving a California state or local government entity may require a separate written claim, often within six months. Exceptions and separate lawsuit deadlines may apply; ask an attorney to evaluate the specific dates promptly."],
  ["Call us before talking to either insurer.", "Notify your own insurer as required by your policy. If you need advice about an insurer's request for a statement or settlement, contact an attorney promptly without delaying required notice or other deadlines."],
  ["Riders walk in facing a built-in bias, and Mihran M. Ghazaryan's job is to dismantle it. He documents the mechanics of the crash — often with reconstruction — to show what actually happened, presents your injuries in full, and pushes back hard when an insurer tries to blame the rider. You deal directly with the attorney building that narrative, not a rotating intake team.", "Mihran M. Ghazaryan evaluates motorcycle claims using the available evidence about the collision and resulting injuries. Depending on the case, that evidence may include witness accounts, scene photographs, medical records and reconstruction analysis. MMG can address disputed fault allegations without assuming that the rider or another party was responsible."],
] as const;

async function rendered(slug = "motorcycle-accidents") {
  const html = renderToStaticMarkup(await CityPracticePage({params: Promise.resolve({county: "monterey-county", city: "salinas", practiceArea: slug})}));
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'").replaceAll("&#39;", "'").replaceAll("&amp;", "&").replace(/\s+/g, " ").trim();
}

describe("exact attorney-approved motorcycle city copy", () => {
  it.each(replacements)("renders the approved replacement for %s", async (before, after) => {
    const text = await rendered();
    expect(text.split(after)).toHaveLength(2);
    expect(text).not.toContain(before);
  });
  it("keeps the adjacent dooring sentence, earlier deadline note and local body", async () => {
    const text = await rendered();
    expect(text).toContain(replacements[2][1] + " Dooring claims involve California Vehicle Code §22517.");
    expect(text).toContain(INJURY_DEADLINE_NOTE);
    expect(text).toContain("Unique local control paragraph.");
    expect(text).toContain("Unchanged introduction.");
  });
  it("changes exactly five approved strings, preserving all unrelated practice and fallback data", () => {
    let source = readFileSync("src/lib/data/practice-area-content.ts", "utf8").replace(/\r\n/g, "\n");
    for (const [before, after] of replacements) {
      expect(source.split(after)).toHaveLength(2);
      source = source.replace(after, before);
    }
    // Exact pre-edit source from main 3ae332b, normalized only for line endings.
    expect(createHash("sha256").update(source).digest("hex"))
      .toBe("1a382be881f983a2c6462d270bf1fa8ffbcf44b460f824c45620af458e698bc1");
  });
  it("preserves the truck and employment rendering controls", async () => {
    expect(await rendered("truck-accidents")).toContain(TRUCK_EVIDENCE_EXPLANATION);
    expect(await rendered("employment-law")).toContain("continuing violations");
    for (const slug of ["car-accidents", "truck-accidents", "employment-law"])
      for (const [, after] of replacements) expect(await rendered(slug)).not.toContain(after);
  });
  it("limits the new timestamp to motorcycle city pages, not hubs or unrelated routes", () => {
    expect(sharedContentRevision("/locations/monterey-county/salinas/motorcycle-accidents"))
      .toBe(MOTORCYCLE_CITY_COPY_REVISION);
    expect(MOTORCYCLE_CITY_COPY_REVISION).toBe("2026-10-16T04:22:42Z");
    expect(sharedContentRevision("/practice-areas/motorcycle-accidents")).toBeUndefined();
    expect(sharedContentRevision("/locations/monterey-county/salinas/car-accidents")).toBe("2026-10-16");
    expect(sharedContentRevision("/locations/monterey-county/salinas/employment-law")).toBeUndefined();
    expect(sharedContentRevision("/locations/monterey-county/salinas")).toBeUndefined();
  });
});
