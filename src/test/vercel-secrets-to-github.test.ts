import { describe, expect, it } from "vitest";

import { SYNC_KEYS, planSync as planSyncRaw } from "../../scripts/vercel-secrets-to-github.mjs";

type Plan = {
  token: string;
  repo: string;
  environments: string[];
  present: string[];
  missing: string[];
};
// The script is plain JS; give its result a shape for the assertions.
const planSync = (env: Record<string, string>) =>
  planSyncRaw(env) as unknown as Plan;

const base = {
  VERCEL_ENV: "production",
  VERCEL_GIT_REPO_OWNER: "AlwayzLegit",
  VERCEL_GIT_REPO_SLUG: "mmg-law-firm",
  SYNC_SECRETS_GITHUB_TOKEN: "github_pat_x",
};

describe("planSync", () => {
  it("is inert on every normal build", () => {
    expect(planSync({ ...base, SYNC_SECRETS_GITHUB_TOKEN: "" })).toBeNull();
    expect(planSync({ ...base, VERCEL_ENV: "preview" })).toBeNull();
    expect(planSync({})).toBeNull();
  });

  it("targets both Cloudflare environments of the building repo by default", () => {
    const p = planSync({ ...base, RESEND_API_KEY: "re_1", CRON_SECRET: "c" });
    expect(p.repo).toBe("AlwayzLegit/mmg-law-firm");
    expect(p.environments).toEqual(["cloudflare-production", "cloudflare-staging"]);
    expect(planSync({ ...base, SYNC_SECRETS_GITHUB_ENV: " cloudflare-production " }).environments).toEqual(["cloudflare-production"]);
    expect(p.present).toEqual(["RESEND_API_KEY", "CRON_SECRET"]);
    expect(p.missing).toContain("TWILIO_AUTH_TOKEN");
  });

  it("never syncs the site URL or keys outside the allowlist", () => {
    const p = planSync({ ...base, NEXT_PUBLIC_SITE_URL: "https://x", PATH: "/bin", VERCEL_TOKEN: "t" });
    expect(p.present).toEqual([]);
    expect(SYNC_KEYS).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(SYNC_KEYS.some((k: string) => k.startsWith("VERCEL"))).toBe(false);
  });

  it("refuses odd environment names and unknown repos", () => {
    expect(planSync({ ...base, SYNC_SECRETS_GITHUB_ENV: "../x" })).toEqual({ error: "bad-environment-name" });
    expect(planSync({ ...base, SYNC_SECRETS_GITHUB_ENV: "cloudflare-production,a b" })).toEqual({ error: "bad-environment-name" });
    expect(planSync({ VERCEL_ENV: "production", SYNC_SECRETS_GITHUB_TOKEN: "t" })).toEqual({ error: "repo-unknown" });
  });

  it("covers every Worker secret the deploy workflow forwards", async () => {
    const { readFileSync } = await import("node:fs");
    const wf = readFileSync(".github/workflows/cloudflare-deploy.yml", "utf8");
    const forwarded = [...wf.matchAll(/S_([A-Z0-9_]+): \$\{\{ secrets\./g)].map((m) => m[1]);
    for (const k of forwarded) expect(SYNC_KEYS, k).toContain(k);
  });
});
