import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Fraunces, Lato, Libre_Baskerville } from "next/font/google";

import { PostHogLoader } from "@/components/analytics/posthog-loader";
import { SchemaGraph } from "@/components/seo/schema-graph";
import { DeferredToaster } from "@/components/ui/deferred-toaster";
import { FIRM, SITE } from "@/lib/constants";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo/canonical";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  // Only opsz is actually referenced from CSS. SOFT added a second
  // preload woff2 with no visual effect — dropped.
  axes: ["opsz"],
});

// Public-site typefaces (v3 design): Georgia first with Libre Baskerville
// as the web fallback for systems without Georgia (e.g. Android), and Lato
// for small uppercase eyebrows. Libre isn't preloaded — most visitors render
// Georgia and never download it.
const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre",
  display: "swap",
  preload: false,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gaId = env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${libre.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <SchemaGraph />

        {children}
        {/* Analytics loads after the page is idle — never on the critical path. */}
        <PostHogLoader />

        <DeferredToaster richColors closeButton />

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
