import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  // Tree-shake the admin charting lib's barrel so analytics/dashboard route
  // bundles only pull the chart pieces they use. (lucide-react is already in
  // Next's built-in optimized list.)
  experimental: {
    optimizePackageImports: ["recharts"],
  },
  images: {
    // Serve modern formats; AVIF first with WebP fallback. Cuts hero/headshot
    // and Supabase-hosted media weight substantially for supporting browsers.
    formats: ["image/avif", "image/webp"],
    // Allow a leaner quality for LCP hero/priority images alongside the
    // default. (Next 16 requires non-75 qualities to be declared.)
    qualities: [65, 75],
    // Cache optimized derivatives on the Vercel image CDN for 30 days — the
    // attorney photos and hero art are effectively static, so re-optimizing
    // them per request is wasted work.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    // 301s from legacy Squarespace URLs to their new homes, preserving the
    // link equity / inbound links the old paths still carry. (Surfaced as
    // 4xx errors in the Semrush site audit after the rebuild cutover.)
    return [
      {
        source: "/car-accidents",
        destination: "/practice-areas/car-accidents",
        permanent: true,
      },
      {
        source: "/trucking-accidents",
        destination: "/practice-areas/truck-accidents",
        permanent: true,
      },
      {
        source: "/motorcycle-accidents",
        destination: "/practice-areas/motorcycle-accidents",
        permanent: true,
      },
      {
        source: "/pedestrian-accidents",
        destination: "/practice-areas/pedestrian-accidents",
        permanent: true,
      },
      {
        source: "/bicycle-accidents",
        destination: "/practice-areas/bicycle-accidents",
        permanent: true,
      },
      {
        source: "/slip-fall",
        destination: "/practice-areas/slip-and-fall",
        permanent: true,
      },
      {
        source: "/personal-injury",
        destination: "/practice-areas",
        permanent: true,
      },
      {
        source: "/about-mmg-lawfirm",
        destination: "/attorneys/mihran-ghazaryan",
        permanent: true,
      },
      { source: "/cart", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Belt-and-suspenders to Vercel's edge HSTS. Two years, subdomains,
          // preload-eligible.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // NOTE: Content-Security-Policy is emitted per-request from
          // src/proxy.ts so it can carry a fresh nonce + strict-dynamic.
          // Keeping it here too would send a second, conflicting CSP header.
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [["remark-gfm", {}]],
    rehypePlugins: [["rehype-slug", {}]],
  },
});

// Sentry's build plugin uploads source maps and wires error monitoring.
// It only does work when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT
// are set; in their absence the wrapper is a no-op.
export default withSentryConfig(withMDX(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Strip source maps from the public build output after upload. Sentry
  // still resolves stack frames via its uploaded copy.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
