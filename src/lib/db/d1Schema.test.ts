import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { D1_SCHEMA } from "@/lib/db/d1Schema.generated";
import { loadPostgresSql, parsePostgresTables } from "../../../scripts/cloudflare/pg-tables.mjs";
import { convertValue, parseSchema, sqlLiteral } from "../../../scripts/cloudflare/d1-convert.mjs";

const ROOT = join(__dirname, "../../..");
const SQL = readFileSync(join(ROOT, "migrations/d1/0001_schema.sql"), "utf8");

describe("D1 schema twin of supabase/migrations", () => {
  const pg = parsePostgresTables(loadPostgresSql(ROOT)) as Record<string, string[]>;

  it("finds the Postgres tables (guards the parser)", () => {
    expect(Object.keys(pg)).toHaveLength(27);
    expect(pg.leads).toContain("sla_alerted_at");
    expect(pg.blog_posts).toContain("word_count");
    expect(pg).not.toHaveProperty("trusted_devices");
  });

  // The auth_* tables (migrations/d1/0002_auth.sql, OPS-365) are Better Auth's
  // own: the Postgres twin of the sign-in is Supabase's auth schema, which
  // supabase/migrations does not hold. Everything else is the twin.
  const BETTER_AUTH_TABLES = ["auth_accounts", "auth_sessions", "auth_users", "auth_verifications"];

  it("has a D1 table for every Postgres table, plus the four Better Auth tables", () => {
    const twin = Object.keys(D1_SCHEMA).filter((t) => !BETTER_AUTH_TABLES.includes(t));
    expect(twin.sort()).toEqual(Object.keys(pg).sort());
    expect(Object.keys(D1_SCHEMA).filter((t) => BETTER_AUTH_TABLES.includes(t)).sort()).toEqual(BETTER_AUTH_TABLES);
  });

  it.each(Object.keys(pg))("table %s has every Postgres column and no other", (table) => {
    const d1 = Object.keys(D1_SCHEMA[table].columns).sort();
    expect(d1).toEqual([...pg[table]].sort());
  });

  it("classifies booleans and JSON columns", () => {
    expect(D1_SCHEMA.leads.columns.tags).toBe("json");
    expect(D1_SCHEMA.leads.columns.intake).toBe("json");
    expect(D1_SCHEMA.counties.columns.is_published).toBe("bool");
    expect(D1_SCHEMA.tasks.columns.done).toBe("bool");
    expect(D1_SCHEMA.blog_posts.columns.practice_area_ids).toBe("json");
  });

  it("knows the foreign keys the embeds follow", () => {
    expect(D1_SCHEMA.location_pages.fks).toEqual(expect.arrayContaining([
      { column: "city_id", table: "cities", refColumn: "id" },
      { column: "practice_area_id", table: "practice_areas", refColumn: "id" },
    ]));
    expect(D1_SCHEMA.cities.fks).toEqual([{ column: "county_id", table: "counties", refColumn: "id" }]);
    expect(D1_SCHEMA.tasks.fks).toEqual(expect.arrayContaining([{ column: "lead_id", table: "leads", refColumn: "id" }]));
  });

  it("loads in SQLite and leaves no Postgres-only syntax behind", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(SQL);
    const count = (type: string) => Number((db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = ?").get(type) as { n: number }).n);
    expect(count("table")).toBe(27);
    expect(count("index")).toBeGreaterThan(40);
    expect(count("trigger")).toBe(12);
    expect(SQL.replace(/--[^\n]*/g, "")).not.toMatch(/\b(jsonb|timestamptz|uuid|gen_random_uuid|now\(\)|auth\.users)\b/i);
    // Idempotent: a second run (wrangler re-applies) changes nothing.
    expect(() => db.exec(SQL)).not.toThrow();
  });

  it("0002_auth.sql is additive: tables and indexes only, safe to run twice, admin_profiles untouched", () => {
    const sql = readFileSync(join(ROOT, "migrations/d1/0002_auth.sql"), "utf8");
    const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    const statements = code.split(";").map((x) => x.trim()).filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    for (const st of statements) expect(st).toMatch(/^CREATE (TABLE|INDEX) IF NOT EXISTS /);
    expect(code).not.toMatch(/\b(ALTER|DROP|UPDATE|INSERT|REPLACE)\b|DELETE\s+FROM/i);
    expect(code).not.toMatch(/admin_profiles/);
    const db = new DatabaseSync(":memory:");
    db.exec(SQL);
    db.exec(sql);
    expect(() => db.exec(sql)).not.toThrow();
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'auth_%' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
    expect(tables).toEqual(["auth_accounts", "auth_sessions", "auth_users", "auth_verifications"]);
  });

  it("parseSchema agrees with the map on table count", () => {
    expect(parseSchema(SQL)).toHaveLength(Object.keys(D1_SCHEMA).length - 4); // minus the Better Auth tables of 0002
    expect(convertValue(true, "bool")).toBe(1);
    expect(sqlLiteral("it's")).toBe("'it''s'");
  });
});
