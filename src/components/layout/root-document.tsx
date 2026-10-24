import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Lato, Libre_Baskerville } from "next/font/google";

import { PublicAnalytics } from "@/components/analytics/public-analytics";
import { SchemaGraph } from "@/components/seo/schema-graph";
import { DeferredToaster } from "@/components/ui/deferred-toaster";
import { FIRM, SITE } from "@/lib/constants";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo/canonical";

import "@/app/globals.css";

// Inter and Fraunces only render in the admin: the public site's
// `.theme-v3` maps both variables to the Georgia stack. Not preloading them
// saves ~115 KB of font downloads competing with every public page's LCP;
// the admin fetches them on first use (display: swap).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  // Only opsz is actually referenced from CSS. SOFT added a second
  // woff2 with no visual effect — dropped.
  axes: ["opsz"],
  preload: false,
});

// Public-site typefaces (v3 design): Georgia first with Libre Baskerville
// as the web fallback for systems without Georgia (Android, Linux), and Lato
// for small uppercase eyebrows. Libre is only a stand-in for Georgia, so it
// uses display "optional" (preloaded): used if it's ready at first paint,
// otherwise that visit keeps the metric-matched fallback. With "swap", a late
// Libre re-wrapped phone-width text after first paint (CLS 0.17 on the car
// hub on Android-like devices). Devices with Georgia download ~34 KB they
// don't render.
const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
  display: "optional",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-lato",
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
    { media: "(prefers-color-scheme: light)", color: "#12171b" },
    { media: "(prefers-color-scheme: dark)", color: "#12171b" },
  ],
};

export default function RootDocument({
  children,
  publicAnalytics = false,
  bodyClassName,
}: Readonly<{
  children: React.ReactNode;
  publicAnalytics?: boolean;
  /** Theme class for this root (e.g. "theme-admin"). */
  bodyClassName?: string;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${libre.variable} ${lato.variable} h-full antialiased`}
    >
      <body
        className={["flex min-h-full flex-col", bodyClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <SchemaGraph />

        {children}
        <DeferredToaster richColors closeButton />
        {publicAnalytics ? (
          <PublicAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />
        ) : null}
      </body>
    </html>
  );
}
