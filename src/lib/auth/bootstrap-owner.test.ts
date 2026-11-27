import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { consumeLink } from "@/lib/auth/links";
import { nodeD1 } from "@/test/node-d1";

// `pnpm bootstrap-owner --provider better-auth` prints SQL and a link
// (OPS-365). The SQL, run on the D1 schema, must make a link that
// src/lib/auth/links.ts accepts exactly once.

const ROOT = join(__dirname, "../../..");

describe("bootstrap-owner --provider better-auth", () => {
  const out = execFileSync("node", ["scripts/bootstrap-owner.mjs", "--provider", "better-auth", "--email", "O'Brien@Example.com", "--name", "Test O'Brien"], {
    cwd: ROOT,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: "https://staging.example.test" },
    encoding: "utf8",
  });
  const statements = out.split("\n").filter((l) => l.startsWith("INSERT"));
  const link = out.split("\n").find((l) => l.includes("/auth/callback"))!.trim();

  it("prints three statements and a link to /auth/callback with a token", () => {
    expect(statements).toHaveLength(3);
    const url = new URL(link);
    expect(url.origin).toBe("https://staging.example.test");
    expect(url.searchParams.get("type")).toBe("invite");
    expect(url.searchParams.get("next")).toBe("/onboarding");
    expect(url.searchParams.get("token")!.length).toBeGreaterThanOrEqual(40);
  });

  it("puts only the token's hash in the SQL", () => {
    expect(statements.join("\n")).not.toContain(new URL(link).searchParams.get("token")!);
  });

  it("makes an owner profile and a link that works once", async () => {
    const raw = new DatabaseSync(":memory:");
    raw.exec(readFileSync(join(ROOT, "migrations/d1/0001_schema.sql"), "utf8"));
    raw.exec(readFileSync(join(ROOT, "migrations/d1/0002_auth.sql"), "utf8"));
    for (const st of statements) raw.exec(st);
    const user = raw.prepare("SELECT id, email, name FROM auth_users").get() as { id: string; email: string; name: string };
    expect(user).toMatchObject({ email: "o'brien@example.com", name: "Test O'Brien" });
    expect(raw.prepare("SELECT role, password_set FROM admin_profiles WHERE user_id = ?").get(user.id)).toEqual({ role: "owner", password_set: 0 });
    const token = new URL(link).searchParams.get("token")!;
    expect(await consumeLink(nodeD1(raw), { token, type: "invite" })).toBe(user.id);
    expect(await consumeLink(nodeD1(raw), { token, type: "invite" })).toBeNull();
  });
});
