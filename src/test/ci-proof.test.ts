import { expect, it } from "vitest";

// Temporary proof file for OPS-45. It never reaches main (squash merge).
const n: number = "not a number";

it("proof", () => {
  expect(n).toBeDefined();
});
