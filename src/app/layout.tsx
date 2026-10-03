import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import Script from "next/script";

import { PostHogLoader } from "@/components/analytics/posthog-loader";
import { Instrument_Sans, Newsreader } from "next/font/google";

import { SchemaGraph } from "@/components/seo/schema-graph";
import { FIRM, SITE } from "@/lib/constants";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo/canonical";

import "./globals.css";

// Sonner ships its own CSS-in-JS + portal; nothing renders until a toast
// fires, so the runtime can defer the chunk entirely.
const Toaster = dynamic(() =>
  import("@/components/ui/sonner").then((m) => m.Toaster),
);


// Redesign v2 type: Instrument Sans for UI/body, Newsreader (optical-size
// axis) for display. Weights/styles limited to what the design uses so the
// font payload stays within the Lighthouse budget.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  // Static 500/600 (+ italics). The variable wght+opsz file was ~147 KB per
  // style on the critical path; the four static cuts total well under that.
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${FIRM.legalName} — California Personal-Injury Attorney`,
    template: `%s | ${FIRM.legalName}`,
  },
  description: SITE.description,
  metadataBase: new URL(siteUrl()),
  applicationName: FIRM.legalName,
  authors: [{ name: FIRM.attorneyName }],
  keywords: [
    "personal injury attorney California",
    "Glendale personal injury lawyer",
    "car accident lawyer California",
    "Armenian-speaking attorney",
    FIRM.legalName,
  ],
  // Google Search Console site-verification. When the token is set,
  // Next.js emits <meta name="google-site-verification" …> in <head> on
  // every page, satisfying GSC's "HTML tag" verification method.
  ...(env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),

  // No explicit `icons` — Next.js App Router auto-discovers
  // src/app/icon.png and generates favicons in every required size.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gaId = env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <SchemaGraph />

        {children}
        {/* Analytics loads after the page is idle — never on the critical path. */}
        <PostHogLoader />

        <Toaster richColors closeButton />

        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: true });`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
