import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Fraunces } from "next/font/google";

import { SchemaGraph } from "@/components/seo/schema-graph";
import { Toaster } from "@/components/ui/sonner";
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
  axes: ["opsz", "SOFT"],
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
  icons: {
    icon: "/favicon.ico",
  },
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

        {children}

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
