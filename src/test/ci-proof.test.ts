import { expect, it } from "vitest";

// Temporary proof file for OPS-45. It never reaches main (squash merge).
it("proof: fails on purpose", () => {
  expect(1).toBe(2);
});
