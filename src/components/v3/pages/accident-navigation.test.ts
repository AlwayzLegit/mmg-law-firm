import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("core accident-page breadcrumbs", () => {
  it.each(["car", "truck", "moto"])(
    "%s keeps its Home link without speculative homepage downloads",
    (page) => {
      const source = readFileSync(
        `src/components/v3/pages/${page}.tsx`,
        "utf8",
      );
      expect(source).toContain('<Link href="/" prefetch={false}');
      expect(source).not.toMatch(/<Link href="\/"(?! prefetch=\{false\})/);
    },
  );
});
