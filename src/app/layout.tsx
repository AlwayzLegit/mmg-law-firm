import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import Script from "next/script";
import { Inter, Fraunces } from "next/font/google";

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

// PostHog runs entirely client-side; lazy-loaded so the analytics chunk
// doesn't block hydration. When NEXT_PUBLIC_POSTHOG_KEY isn't set the
// provider passes children through unchanged.
const PostHogProvider = dynamic(() =>
  import("@/components/analytics/posthog-provider").then(
    (m) => m.PostHogProvider,
  ),
);

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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gaId = env.NEXT_PUBLIC_GA_ID;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <SchemaGraph />

        <PostHogProvider>{children}</PostHogProvider>

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
