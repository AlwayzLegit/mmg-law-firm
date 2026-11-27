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

  it("has a D1 table for every Postgres table", () => {
    expect(Object.keys(D1_SCHEMA).sort()).toEqual(Object.keys(pg).sort());
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

  it("parseSchema agrees with the map on table count", () => {
    expect(parseSchema(SQL)).toHaveLength(Object.keys(D1_SCHEMA).length);
    expect(convertValue(true, "bool")).toBe(1);
    expect(sqlLiteral("it's")).toBe("'it''s'");
  });
});
