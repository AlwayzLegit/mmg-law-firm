import Link from "next/link";

type Props = {
  heading: string;
  intro?: string;
  links: { href: string; label: string }[];
};

/** Live internal links (e.g. city × practice pages) in the v3 visual style. */
export function V3CityLinks({ heading, intro, links }: Props) {
  if (links.length === 0) return null;
  return (
    <section className="v3-page" style={{ background: "#fbf8f1", borderTop: "1px solid #ebe1cc" }}>
      <div
        style={{
          maxWidth: 1536,
          margin: "0 auto",
          padding: "56px clamp(20px,6.5vw,100px) 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ flex: "none", width: 44, height: 1.5, background: "#987022" }} />
          <p style={{ fontSize: 14, letterSpacing: ".2em", color: "#987022" }}>SERVING CALIFORNIA</p>
        </div>
        <h2
          style={{
            marginTop: 14,
            fontSize: "clamp(32px,2.8vw,44px)",
            lineHeight: 1.1,
            fontWeight: 400,
            color: "#131a20",
          }}
        >
          {heading}
        </h2>
        {intro ? (
          <p style={{ marginTop: 14, maxWidth: "42em", fontSize: 18, lineHeight: 1.6, color: "#4a5157" }}>
            {intro}
          </p>
        ) : null}
        <ul
          style={{
            listStyle: "none",
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,260px),1fr))",
            gap: 12,
          }}
        >
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="v3-citylink"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  border: "1px solid #e3d6bb",
                  borderRadius: 3,
                  background: "#fffdf8",
                  fontSize: 17,
                  color: "#131a20",
                }}
              >
                {l.label}
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#987022" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
                  <path d="M5 12h14" />
                  <path d="M13 18l6-6" />
                  <path d="M13 6l6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
