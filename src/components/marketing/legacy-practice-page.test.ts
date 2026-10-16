import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/(marketing)/practice-areas/[slug]/page.tsx", "utf8").replace(/\r\n/g, "\n");
const legacy = readFileSync("src/components/marketing/legacy-practice-page.tsx", "utf8").replace(/\r\n/g, "\n");
const controls = readFileSync("src/components/marketing/legacy-practice-controls.tsx", "utf8");
const hash = (value: string) => createHash("sha256").update(value.trim()).digest("hex");

describe("legacy practice template isolation", () => {
  it("keeps the frozen metadata function byte-for-byte unchanged from the release baseline", () => {
    // Owner approval is required before any title/description or fallback edit.
    const file = ts.createSourceFile("page.tsx", route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const metadata = file.statements.find(
      (node) => ts.isFunctionDeclaration(node) && node.name?.text === "generateMetadata",
    );
    expect(metadata).toBeDefined();
    expect(hash(metadata!.getText(file))).toBe("cfefffe6a170ed0aae89e16bdd85c4ec9f632a872454658aa8ac675d463200ef");
  });

  it("moves the existing legacy queries, JSX, copy and schema without rewriting them", () => {
    const start = legacy.indexOf("  const [content, inlineResults, locationPages] = await Promise.all([");
    expect(start).toBeGreaterThan(0);
    expect(hash(legacy.slice(start))).toBe("46ce49be0741c2b9ef6f2ab5f8e23f74bf08a643daf2771f124d99c5562ef5c1");
  });

  it("does not eagerly import the legacy client controls in the route", () => {
    expect(route).not.toContain('from "@/components/marketing/faq"');
    expect(route).not.toContain('from "@/components/marketing/lead-form"');
    expect(route).toContain('import("@/components/marketing/legacy-practice-page")');
    expect(route).toContain("const LegacyPracticePage = dynamic(");
    expect(route.indexOf("return <LegacyPracticePage")).toBeGreaterThan(route.indexOf("<V3PageShell"));
  });

  it("keeps server rendering and the existing route policy", () => {
    expect(route + legacy).not.toMatch(/["']use client["']/);
    expect(route + legacy).not.toMatch(/ssr\s*:\s*false/);
    expect(route).toContain("export const dynamicParams = false;");
    expect(route).toContain("export const revalidate = 86400;");
    expect(route).toContain("return PRACTICE_AREAS.map((p) => ({ slug: p.slug }));");
    expect(legacy).toContain("if (!content) notFound();");
  });

  it("splits the legacy controls inside a client boundary without disabling SSR", () => {
    expect(controls).toMatch(/^"use client";/);
    expect(controls).toContain('dynamic(() => import("./faq")');
    expect(controls).toContain('import("./lead-form")');
    expect(controls).not.toMatch(/ssr\s*:\s*false/);
    expect(legacy).toContain('from "@/components/marketing/legacy-practice-controls"');
    expect(legacy).not.toContain('from "@/components/marketing/faq"');
    expect(legacy).not.toContain('from "@/components/marketing/lead-form"');
  });
});
