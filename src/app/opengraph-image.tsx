import { FIRM } from "@/lib/constants";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = `${FIRM.legalName} — California personal-injury counsel`;

export default function OpengraphImage() {
  return renderOgImage({
    title: "California personal-injury counsel.",
    subtitle:
      "Free consultation. Bilingual representation. No fee unless we win.",
  });
}
