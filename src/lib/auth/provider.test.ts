import { afterEach, describe, expect, it } from "vitest";

import { authProvider } from "@/lib/auth/provider";

const saved = process.env.AUTH_PROVIDER;
afterEach(() => {
  if (saved === undefined) delete process.env.AUTH_PROVIDER;
  else process.env.AUTH_PROVIDER = saved;
});

describe("authProvider", () => {
  it.each([undefined, "", "Better-Auth", "BETTER-AUTH", "nextauth", "supabase", " better-auth"])(
    "is supabase for %j",
    (value) => {
      if (value === undefined) delete process.env.AUTH_PROVIDER;
      else process.env.AUTH_PROVIDER = value;
      expect(authProvider()).toBe("supabase");
    },
  );

  it("is better-auth only for the exact value", () => {
    process.env.AUTH_PROVIDER = "better-auth";
    expect(authProvider()).toBe("better-auth");
  });
});
