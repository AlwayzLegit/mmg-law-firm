import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { createD1DataClient, type D1Like } from "@/lib/db/d1Client";
import { buildBetterAuth } from "@/lib/auth/better";
import { authRowsFromSupabase } from "@/lib/auth/import-users";
import { consumeLink, issueLink } from "@/lib/auth/links";

// Smoke test against a REAL D1 database (wrangler's local one, in workerd),
// not the Node SQLite fake: it proves the schema file and the client's SQL
// run on D1's engine. It only runs when D1_SMOKE=1 and the schema has been
// applied to the local D1, which the "D1 data layer" job in .github/workflows/ci.yml does:
//
//   wrangler d1 execute DB --local --persist-to .wrangler/state --config cloudflare/wrangler.d1-ci.jsonc --file migrations/d1/0001_schema.sql
//   D1_SMOKE=1 pnpm exec vitest run src/lib/db/d1Smoke.test.ts
//
// Steps 6 and 7 (OPS-365) run the admin sign-in on the same engine: a user
// imported from Supabase rows signs in through Better Auth and gets a session
// row, and a recovery token works once. They apply migrations/d1/0002_auth.sql
// themselves, statement by statement (it is additive and safe to run twice).
//
// It uses no secret and no Cloudflare account: the database is local.

const RUN = process.env.D1_SMOKE === "1";
type Row = Record<string, unknown>;
// A fresh name per run, so the test can run twice against the same local database.
const RUN_ID = `smoke-${Date.now().toString(36)}`;

describe.skipIf(!RUN)("d1 smoke (local D1)", () => {
  let dispose: () => Promise<void>;
  let db: D1Like;
  const passed: string[] = [];

  beforeAll(async () => {
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy<{ DB: D1Like }>({ configPath: "cloudflare/wrangler.d1-ci.jsonc", persist: { path: ".wrangler/state/v3" } });
    dispose = proxy.dispose;
    db = proxy.env.DB;
    // OPS-365: the Better Auth tables. Statements are split on ";" outside comments.
    const sql = readFileSync(join(process.cwd(), "migrations/d1/0002_auth.sql"), "utf8");
    const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    for (const st of code.split(";").map((x) => x.trim()).filter(Boolean)) await db.prepare(st).run();
  }, 60_000);

  afterAll(async () => {
    process.stdout.write(`d1 smoke: ${passed.length} of 7\n`);
    await dispose?.();
  });

  const client = () => createD1DataClient(async () => db);

  it("1. reads published practice areas (the health check)", async () => {
    const res = await client().from<Row[]>("practice_areas").select("slug, is_published").eq("is_published", true).limit(1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]); // empty schema, no seed rows yet: the query ran
    passed.push("read");
  });

  it("2. inserts and reads a lead, JSON and booleans decoded", async () => {
    const c = client();
    const ins = await c.from<Row>("leads").insert({ full_name: RUN_ID, phone: "+18185550100", intake: { a: 1 }, tags: [RUN_ID] }).select("id, status, tags, intake, updated_at").single();
    expect(ins.error).toBeNull();
    expect(ins.data).toMatchObject({ status: "new", tags: [RUN_ID], intake: { a: 1 } });
    const read = await c.from<Row>("leads").select("full_name").eq("id", ins.data!.id).single();
    expect(read.data).toEqual({ full_name: RUN_ID });
    passed.push("insert");
  });

  it("3. finds rows by tag with .contains()", async () => {
    const res = await client().from<Row[]>("leads").select("full_name").contains("tags", [RUN_ID]);
    expect(res.data).toEqual([{ full_name: RUN_ID }]);
    passed.push("contains");
  });

  it("4. embeds practice_areas(slug) and nested !inner embeds", async () => {
    const c = client();
    const { data: pa } = await c.from<Row>("practice_areas").insert({ slug: RUN_ID, name: "Smoke", short_name: "Smoke", noun_singular: "s", noun_plural: "s", lawyer_phrase: "s" }).select("id").single();
    await c.from("leads").update({ practice_area_id: pa!.id }).eq("full_name", RUN_ID);
    const one = await c.from<Row[]>("leads").select("full_name, practice_areas(slug)").eq("full_name", RUN_ID);
    expect(one.data).toEqual([{ full_name: RUN_ID, practice_areas: { slug: RUN_ID } }]);
    const { data: county } = await c.from<Row>("counties").insert({ slug: `${RUN_ID}-county`, name: "Smoke County", short_name: "Smoke" }).select("id").single();
    const { data: city } = await c.from<Row>("cities").insert({ county_id: county!.id, slug: `${RUN_ID}-city`, name: "Smoke City" }).select("id").single();
    await c.from("location_pages").insert({ city_id: city!.id, practice_area_id: pa!.id });
    const nested = await c
      .from<Row[]>("location_pages")
      .select("id, cities!inner(slug, counties!inner(slug)), practice_areas!inner(slug)")
      .eq("cities.counties.slug", `${RUN_ID}-county`)
      .eq("practice_areas.slug", RUN_ID);
    expect(nested.data).toEqual([{ id: expect.any(String), cities: { slug: `${RUN_ID}-city`, counties: { slug: `${RUN_ID}-county` } }, practice_areas: { slug: RUN_ID } }]);
    passed.push("embed");
  });

  it("5. counts rows and touches updated_at through the trigger", async () => {
    const c = client();
    const head = await c.from("leads").select("id", { count: "exact", head: true }).eq("full_name", RUN_ID);
    expect(head.count).toBe(1);
    const before = await c.from<Row>("counties").select("updated_at").eq("slug", `${RUN_ID}-county`).single();
    await new Promise((r) => setTimeout(r, 15));
    await c.from("counties").update({ region: "x" }).eq("slug", `${RUN_ID}-county`);
    const after = await c.from<Row>("counties").select("updated_at").eq("slug", `${RUN_ID}-county`).single();
    expect(String(after.data!.updated_at) > String(before.data!.updated_at)).toBe(true);
    passed.push("count");
  });
  // Steps 6 and 7: the admin sign-in (OPS-365).
  const USER_ID = crypto.randomUUID();
  const EMAIL = `${RUN_ID}@smoke.test`;
  const PASSWORD = "smoke test password";
  const auth = () => buildBetterAuth({ database: db, db, secret: "smoke-secret-smoke-secret-smoke-secret!", secure: false, allow: async () => true });
  const count = async (sql: string, ...binds: unknown[]) => Number(((await db.prepare(sql).bind(...binds).all<{ n: number }>()).results[0] ?? { n: 0 }).n);

  it("6. a user imported from Supabase rows signs in through Better Auth and gets a session row", async () => {
    const { users, accounts } = authRowsFromSupabase([{ id: USER_ID, email: EMAIL, encrypted_password: bcrypt.hashSync(PASSWORD, 4), email_confirmed_at: "2026-01-01T00:00:00Z" }]);
    const u = users[0];
    const a = accounts[0];
    await db.prepare("INSERT INTO auth_users (id, email, name, email_verified, banned_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(u.id, u.email, u.name, u.email_verified, u.banned_until, u.created_at, u.updated_at).run();
    await db.prepare("INSERT INTO auth_accounts (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(a.id, a.user_id, a.account_id, a.provider_id, a.password, a.created_at, a.updated_at).run();
    await db.prepare("INSERT INTO admin_profiles (user_id, role, full_name, password_set) VALUES (?, 'owner', 'Smoke', 1)").bind(USER_ID).run();
    const res = await auth().api.signInEmail({ body: { email: EMAIL, password: PASSWORD }, headers: new Headers() });
    expect(res.user.id).toBe(USER_ID);
    expect(await count("SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id = ?", USER_ID)).toBe(1);
    passed.push("sign-in");
  });

  it("7. a recovery token works once and is refused the second time", async () => {
    const { token } = await issueLink(db, { userId: USER_ID, type: "recovery" });
    expect(await consumeLink(db, { token, type: "recovery" })).toBe(USER_ID);
    expect(await consumeLink(db, { token, type: "recovery" })).toBeNull();
    passed.push("link");
  });
});
