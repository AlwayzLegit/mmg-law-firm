import { ImageResponse } from "next/og";

import { FIRM } from "@/lib/constants";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = `${FIRM.legalName} — California personal-injury counsel`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
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
            Attorney Advertising
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            California personal-injury counsel.
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 400,
              opacity: 0.85,
              maxWidth: 900,
            }}
          >
            Free consultation. Bilingual representation. No fee unless we win.
          </span>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{FIRM.phone}</span>
            <span>
              {FIRM.address.city}, {FIRM.address.state}
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
