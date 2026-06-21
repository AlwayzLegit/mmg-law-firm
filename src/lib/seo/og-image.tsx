import { ImageResponse } from "next/og";

import { FIRM } from "@/lib/constants";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Shared Open Graph / Twitter card renderer. One brand-consistent template
 * with a per-page eyebrow + headline + optional subtitle, so practice areas,
 * blog posts, and city × practice pages each get their own social image
 * without duplicating layout. System fonts only (no font fetch) to keep
 * generation fast and dependency-free.
 */
export function renderOgImage({
  eyebrow = "Attorney Advertising",
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}): ImageResponse {
  // Scale the headline down a little for very long titles so they don't
  // overflow the card.
  const titleSize = title.length > 48 ? 60 : title.length > 30 ? 70 : 80;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background:
          "linear-gradient(140deg, #18298c 0%, #2b46d8 60%, #5d77f0 100%)",
        color: "white",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#c9a35a",
            color: "#18298c",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          MMG
        </div>
        <span
          style={{
            fontSize: 26,
            fontWeight: 500,
            opacity: 0.9,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            style={{
              fontSize: 32,
              fontWeight: 400,
              opacity: 0.85,
              maxWidth: 940,
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 22,
          opacity: 0.85,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 28 }}>
            {FIRM.legalName}
          </span>
          <span>
            {FIRM.attorneyName} · CA Bar #{FIRM.barNumber}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <span style={{ fontWeight: 600 }}>{FIRM.phone}</span>
          <span>
            {FIRM.address.city}, {FIRM.address.state}
          </span>
        </div>
      </div>
    </div>,
    OG_SIZE,
  );
}

/** Title-case a URL slug ("los-angeles" → "Los Angeles") for OG titles. */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
