import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeadManagerContext } from "next/dist/shared/lib/head-manager-context.shared-runtime";
import Script from "next/script";
import { afterEach, describe, expect, it, vi } from "vitest";

const testEnv = vi.hoisted(() => ({ NEXT_PUBLIC_GA_ID: "G-TEST", NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: undefined }));
vi.mock("@/lib/env", () => ({ env: testEnv }));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "test-font" });
  return { Inter: font, Fraunces: font, Lato: font, Libre_Baskerville: font };
});
vi.mock("@/components/analytics/posthog-loader", () => ({ PostHogLoader: () => null }));
vi.mock("@/components/seo/schema-graph", () => ({ SchemaGraph: () => null }));
vi.mock("@/components/ui/deferred-toaster", () => ({ DeferredToaster: () => null }));
import RootLayout from "@/app/layout";

const src = "https://www.googletagmanager.com/gtag/js?id=G-TEST";
afterEach(() => { testEnv.NEXT_PUBLIC_GA_ID = "G-TEST"; });

function html() {
  // Exercise real React preload de-duplication and Next's appDir Script,
  // not a mock of the behavior responsible for the high-priority request.
  return renderToStaticMarkup(createElement(HeadManagerContext.Provider,
    { value: { appDir: true } }, createElement(RootLayout, null, "Page control")));
}

function scripts(node: ReactNode): Array<Record<string, unknown>> {
  if (Array.isArray(node)) return node.flatMap(scripts);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return node.type === Script ? [node.props] : scripts(node.props.children);
}

describe("Google tag resource priority without analytics deferral", () => {
  it("renders one low-priority preload even when Next requests its own preload", () => {
    const markup = html();
    const links = markup.match(/<link\b[^>]*>/g) ?? [];
    const google = links.filter((tag) => tag.includes(src));
    expect(google).toHaveLength(1);
    expect(google[0]).toContain('rel="preload"');
    expect(google[0]).toContain('as="script"');
    expect(google[0]).toContain('fetchPriority="low"');
    expect(markup).toContain("Page control");
  });

  it("keeps both scripts afterInteractive and the exact existing config queue", () => {
    const tags = scripts(RootLayout({ children: null }));
    expect(tags).toHaveLength(2);
    expect(tags[0]).toMatchObject({ src, strategy: "afterInteractive", fetchPriority: "low" });
    expect(tags[1]).toMatchObject({ id: "ga-init", strategy: "afterInteractive" });
    expect(tags[1].children).toBe("window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-TEST', { send_page_view: true });");
  });

  it("does not create analytics requests when the configured ID is absent", () => {
    testEnv.NEXT_PUBLIC_GA_ID = "";
    expect(html()).not.toContain("googletagmanager");
    expect(scripts(RootLayout({ children: null }))).toHaveLength(0);
  });

  it("preserves the exact prior root layout outside the three priority insertions", () => {
    const source = readFileSync("src/app/layout.tsx", "utf8").replace(/\r\n/g, "\n")
      .replace('import { preload } from "react-dom";\n', "")
      .replace(/\n  \/\/ Next's afterInteractive Script also emits a server-side preload\.[\s\S]*?\n  }\n/, "")
      .replace('              fetchPriority="low"\n', "");
    // Includes all frozen metadata, other analytics, security-related markup,
    // fonts, script initialization and the original JSX order from PR130.
    expect(createHash("sha256").update(source).digest("hex"))
      .toBe("cec6a91b52403ef3f2f07f2aa67ce72a7edb3419259abb62564c355c89ef3cfc");
  });
});
