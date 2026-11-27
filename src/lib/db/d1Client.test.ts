import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createD1DataClient, isTransientD1Error, retryRead, RPCS, type D1Like, type D1Statement } from "@/lib/db/d1Client";
import { likeToGlob, parseLogicString, parseSelect, splitTopLevel } from "@/lib/db/d1Sql";
import { buildSchemaMap, loadMigrationSql, renderSchemaModule } from "../../../scripts/cloudflare/gen-d1-schema-map.mjs";

// The D1 data layer against the real schema (migrations/d1/0001_schema.sql)
// in Node's built-in SQLite, behind a fake of the D1 binding API.

const ROOT = join(__dirname, "../../..");
const SCHEMA_SQL = readFileSync(join(ROOT, "migrations/d1/0001_schema.sql"), "utf8");

function fakeD1(db: DatabaseSync): D1Like {
  const stmt = (sql: string, params: unknown[] = []): D1Statement & { sync(): Record<string, unknown>[] } => ({
    bind: (...values: unknown[]) => stmt(sql, values),
    sync: () => db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    all: async <T,>() => ({ results: db.prepare(sql).all(...(params as never[])) as T[] }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(params as never[])).changes) } }),
  });
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async <T,>(stmts: D1Statement[]) => {
      db.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ results: (s as ReturnType<typeof stmt>).sync() as T[] }));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

type Row = Record<string, unknown>;
let client: ReturnType<typeof createD1DataClient>;
let raw: DatabaseSync;

const pa = (slug: string, name: string) => ({ slug, name, short_name: name, noun_singular: name, noun_plural: name, lawyer_phrase: `${name} lawyer` });

// Two counties, three cities, two practice areas, three location pages.
async function seed() {
  const ins = async (table: string, rows: Row | Row[]) => {
    const res = await client.from<Row[]>(table).insert(rows).select();
    expect(res.error).toBeNull();
    return res.data as Row[];
  };
  const [la, orange] = await ins("counties", [
    { slug: "los-angeles", name: "Los Angeles County", short_name: "Los Angeles", is_published: true },
    { slug: "orange", name: "Orange County", short_name: "Orange", is_published: true },
  ]);
  const [glendale, burbank, irvine] = await ins("cities", [
    { county_id: la.id, slug: "glendale", name: "Glendale", is_published: true },
    { county_id: la.id, slug: "burbank", name: "Burbank", is_published: false },
    { county_id: orange.id, slug: "irvine", name: "Irvine", is_published: true },
  ]);
  const [car, truck] = await ins("practice_areas", [pa("car-accident", "Car Accident"), pa("truck-accident", "Truck Accident")]);
  const pages = await ins("location_pages", [
    { city_id: glendale.id, practice_area_id: car.id, local_angle_md: "angle", is_published: true },
    { city_id: burbank.id, practice_area_id: car.id, is_published: false },
    { city_id: irvine.id, practice_area_id: truck.id, is_published: true },
  ]);
  return { la, orange, glendale, burbank, irvine, car, truck, pages };
}

beforeEach(() => {
  raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec(SCHEMA_SQL);
  client = createD1DataClient(async () => fakeD1(raw));
});

describe("pure parsing", () => {
  it("splits, parses selects and logic trees", () => {
    expect(splitTopLevel("a, b(c, d), e")).toEqual(["a", "b(c, d)", "e"]);
    const s = parseSelect("leads", "id, full_name, area:practice_areas ( id, slug, name )");
    expect(s.columns.map((c) => c.name)).toEqual(["id", "full_name"]);
    expect(s.embeds[0]).toMatchObject({ table: "practice_areas", alias: "area", inner: false });
    const t = parseLogicString("status.eq.new,and(status.eq.contacted,follow_up_at.lte.2026-11-27T10:00:00.000Z),email.not.is.null");
    expect(t).toMatchObject({ join: "or", items: [{ op: "eq", value: "new" }, { join: "and", items: [{ value: "contacted" }, { op: "lte" }] }, { op: "is", value: null, negate: true }] });
    expect(likeToGlob("%@example.test")).toBe("*@example.test");
  });

  it("parses nested and !inner embeds, as the public location queries write them", () => {
    const s = parseSelect("location_pages", "id, cities!inner(slug, name, counties!inner(slug, name)), practice_areas!inner(slug)");
    expect(s.embeds.map((e) => [e.table, e.inner])).toEqual([["cities", true], ["practice_areas", true]]);
    expect(s.embeds[0].embeds[0]).toMatchObject({ table: "counties", inner: true, columns: [{ name: "slug" }, { name: "name" }] });
    expect(() => parseSelect("location_pages", "cities!fk_name(slug)")).toThrow(/not supported/);
  });

  it("rejects unknown columns like PostgREST", () => {
    expect(() => parseSelect("leads", "id, nope")).toThrow(/Could not find the 'nope' column/);
  });

  it("schema map is generated from the current migrations", () => {
    const current = readFileSync(join(ROOT, "src/lib/db/d1Schema.generated.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(current).toBe(renderSchemaModule(buildSchemaMap(loadMigrationSql(ROOT))));
  });
});

describe("reads", () => {
  it("decodes booleans and JSON, filters, orders with Postgres NULL placement", async () => {
    const { la } = await seed();
    await client.from("counties").update({ region: "Southern" }).eq("id", la.id);
    const { data, error } = await client.from<Row[]>("counties").select("slug, is_published, region").eq("is_published", true).order("region", { ascending: false });
    expect(error).toBeNull();
    // DESC puts NULL first in Postgres (SQLite would put it last).
    expect(data!.map((r) => r.slug)).toEqual(["orange", "los-angeles"]);
    expect(data![1].is_published).toBe(true);
    const asc = await client.from<Row[]>("counties").select("slug").order("region", { ascending: true });
    expect(asc.data!.map((r) => r.slug)).toEqual(["los-angeles", "orange"]);
  });

  it("embeds a to-one relation with a column list, and an alias", async () => {
    const { glendale, car } = await seed();
    await client.from("leads").insert({ full_name: "Kim", phone: "+18185550100", practice_area_id: car.id, city_id: glendale.id, intake: { a: 1 } });
    const { data } = await client.from<Row[]>("leads").select("id, full_name, intake, practice_areas(slug), where:cities(name)");
    expect(data![0]).toMatchObject({ full_name: "Kim", intake: { a: 1 }, practice_areas: { slug: "car-accident" }, where: { name: "Glendale" } });
    expect(Object.keys(data![0])).not.toContain("practice_area_id");
    const star = await client.from<Row[]>("leads").select("*, practice_areas(name, slug), counties(name), cities(name)");
    expect(star.data![0]).toMatchObject({ practice_areas: { name: "Car Accident", slug: "car-accident" }, counties: null, cities: { name: "Glendale" } });
    expect(star.data![0].practice_area_id).toBe(car.id);
  });

  it("embeds a to-many relation as an array and an empty one as []", async () => {
    const { la, orange } = await seed();
    const { data } = await client.from<Row[]>("counties").select("slug, cities(slug)").order("slug");
    expect(data).toEqual([
      { slug: "los-angeles", cities: expect.arrayContaining([{ slug: "glendale" }, { slug: "burbank" }]) },
      { slug: "orange", cities: [{ slug: "irvine" }] },
    ]);
    await client.from("cities").delete().eq("county_id", orange.id);
    const again = await client.from<Row[]>("counties").select("slug, cities(slug)").eq("id", orange.id);
    expect(again.data).toEqual([{ slug: "orange", cities: [] }]);
    expect(la.id).toBeTruthy();
  });

  it("nested !inner embeds with filters on embedded columns match the public page query", async () => {
    await seed();
    const select = "intro_md, local_angle_md, cities!inner(slug, name, counties!inner(slug, name)), practice_areas!inner(slug, name)";
    const hit = await client
      .from<Row>("location_pages")
      .select(select)
      .eq("is_published", true)
      .eq("cities.slug", "glendale")
      .eq("cities.counties.slug", "los-angeles")
      .eq("practice_areas.slug", "car-accident")
      .maybeSingle();
    expect(hit.error).toBeNull();
    expect(hit.data).toEqual({
      intro_md: null,
      local_angle_md: "angle",
      cities: { slug: "glendale", name: "Glendale", counties: { slug: "los-angeles", name: "Los Angeles County" } },
      practice_areas: { slug: "car-accident", name: "Car Accident" },
    });
    // The right city under the wrong county, and an unpublished page, find nothing.
    const wrongCounty = await client.from<Row>("location_pages").select(select).eq("cities.slug", "glendale").eq("cities.counties.slug", "orange").maybeSingle();
    expect(wrongCounty).toMatchObject({ data: null, error: null });
    const unpublished = await client.from<Row>("location_pages").select(select).eq("is_published", true).eq("cities.slug", "burbank").maybeSingle();
    expect(unpublished.data).toBeNull();
  });

  it("!inner on a to-one embed drops base rows with no match, a plain embed keeps them", async () => {
    const { car } = await seed();
    await client.from("leads").insert([
      { full_name: "With", phone: "+1", practice_area_id: car.id },
      { full_name: "Without", phone: "+2" },
    ]);
    const inner = await client.from<Row[]>("leads").select("full_name, practice_areas!inner(slug)");
    expect(inner.data).toEqual([{ full_name: "With", practice_areas: { slug: "car-accident" } }]);
    const left = await client.from<Row[]>("leads").select("full_name, practice_areas(slug)").order("full_name");
    expect(left.data).toEqual([
      { full_name: "With", practice_areas: { slug: "car-accident" } },
      { full_name: "Without", practice_areas: null },
    ]);
    // The count agrees with the rows.
    const counted = await client.from("leads").select("id, practice_areas!inner(slug)", { count: "exact", head: true });
    expect(counted.count).toBe(1);
  });

  it("filters on a county slug through !inner (the city list query)", async () => {
    await seed();
    const { data } = await client.from<Row[]>("cities").select("slug, name, counties!inner(slug, name)").eq("counties.slug", "los-angeles").eq("is_published", true);
    expect(data).toEqual([{ slug: "glendale", name: "Glendale", counties: { slug: "los-angeles", name: "Los Angeles County" } }]);
  });

  it("refuses a filter on an embed that is not !inner or not selected", async () => {
    await seed();
    const plain = await client.from("cities").select("slug, counties(slug)").eq("counties.slug", "orange");
    expect(plain.error?.code).toBe("PGRST100");
    expect(plain.error?.message).toContain("counties!inner");
    const missing = await client.from("cities").select("slug").eq("counties.slug", "orange");
    expect(missing.error?.code).toBe("PGRST100");
    // A dotted filter on an update has no select list to resolve it.
    const upd = await client.from("cities").update({ name: "x" }).eq("counties.slug", "orange");
    expect(upd.error).not.toBeNull();
  });

  it(".contains() on a JSON-array column (lead and post tags)", async () => {
    await client.from("leads").insert([
      { full_name: "A", phone: "+1", tags: ["vip", "spanish"] },
      { full_name: "B", phone: "+2", tags: ["vip"] },
      { full_name: "C", phone: "+3" },
    ]);
    const names = async (tags: string[]) => (await client.from<Row[]>("leads").select("full_name").contains("tags", tags).order("full_name")).data!.map((r) => r.full_name);
    expect(await names(["vip"])).toEqual(["A", "B"]);
    expect(await names(["vip", "spanish"])).toEqual(["A"]);
    expect(await names(["nope"])).toEqual([]);
    // tags defaults to [] (Postgres '{}'), and every array contains the empty array.
    expect(await names([])).toEqual(["A", "B", "C"]);
    const string = await client.from<Row[]>("leads").select("full_name").contains("tags", "{spanish}");
    expect(string.data).toEqual([{ full_name: "A" }]);
    const text = await client.from("leads").select("id").contains("full_name", ["A"]);
    expect(text.error?.code).toBe("42883");
    const tags = await client.from<Row>("leads").select("tags").eq("full_name", "A").single();
    expect(tags.data).toEqual({ tags: ["vip", "spanish"] });
  });

  it("or / not / like / ilike / in", async () => {
    await client.from("leads").insert([
      { full_name: "Kim Lee", phone: "+18185550101", email: "kim@x.test", status: "new" },
      { full_name: "Walk In", phone: "+18185550102", email: "w@local.test", status: "signed" },
      { full_name: "jo", phone: "+18185550103", email: "Jo@Y.test", status: "spam" },
    ]);
    const q = "%kim%";
    const or = await client.from<Row[]>("leads").select("email").or(`full_name.ilike.${q},email.ilike.${q},phone.ilike.${q}`);
    expect(or.data!.map((r) => r.email)).toEqual(["kim@x.test"]);
    const open = await client.from<Row[]>("leads").select("full_name").not("status", "in", "(signed,rejected,spam)");
    expect(open.data).toEqual([{ full_name: "Kim Lee" }]);
    const hasFollowUp = await client.from("leads").select("id").not("follow_up_at", "is", null);
    expect(hasFollowUp.data).toEqual([]);
    expect((await client.from<unknown[]>("leads").select("email").ilike("email", "jo@y.test")).data!.length).toBe(1);
    expect((await client.from<unknown[]>("leads").select("email").like("email", "jo@y.test")).data!.length).toBe(0);
    const many = Array.from({ length: 250 }, (_, i) => `id-${i}`).concat(["kim@x.test"]);
    expect((await client.from<unknown[]>("leads").select("email").in("email", many)).data!.length).toBe(1);
    expect((await client.from<unknown[]>("leads").select("email").in("email", [])).data!.length).toBe(0);
  });

  it("count, head, range, single, maybeSingle", async () => {
    await seed();
    const head = await client.from("counties").select("id", { count: "exact", head: true });
    expect(head).toMatchObject({ data: null, count: 2, error: null });
    const page = await client.from<unknown[]>("counties").select("*", { count: "exact" }).order("slug").range(1, 5);
    expect(page.count).toBe(2);
    expect(page.data!.length).toBe(1);
    const none = await client.from("counties").select("*").eq("slug", "nowhere").single();
    expect(none.error?.code).toBe("PGRST116");
    expect(await client.from("counties").select("*").eq("slug", "nowhere").maybeSingle()).toMatchObject({ data: null, error: null });
    expect((await client.from("counties").select("*").maybeSingle()).error?.code).toBe("PGRST116");
  });
});

describe("writes and triggers", () => {
  it("maps constraint failures and unknown columns to Postgres codes", async () => {
    await seed();
    const dup = await client.from("counties").insert({ slug: "orange", name: "x", short_name: "x" });
    expect(dup.error?.code).toBe("23505");
    expect(dup.error?.message).toContain("duplicate key value violates unique constraint");
    expect((await client.from("counties").insert({ slug: "x", name: "x", short_name: "x", nope: 1 })).error?.code).toBe("PGRST204");
    expect((await client.from("cities").insert({ county_id: "missing", slug: "z", name: "Z" })).error?.code).toBe("23503");
    expect((await client.from("leads").insert({ full_name: "No phone" })).error?.code).toBe("23502");
    expect((await client.from("leads").insert({ full_name: "A", phone: "1", status: "bogus" })).error?.code).toBe("23514");
  });

  it("multi-row insert is all-or-nothing", async () => {
    await seed();
    const res = await client.from("counties").insert([{ slug: "ok", name: "o", short_name: "o" }, { slug: "orange", name: "d", short_name: "d" }]);
    expect(res.error?.code).toBe("23505");
    expect((await client.from("counties").select("id", { count: "exact", head: true })).count).toBe(2);
  });

  it("upsert, update and delete with returning / count", async () => {
    await client.from("redirects").upsert({ source_path: "/old", destination: "/a" }, { onConflict: "source_path" });
    const up = await client.from<Row>("redirects").upsert({ source_path: "/old", destination: "/b" }, { onConflict: "source_path" }).select("destination").single();
    expect(up.data).toEqual({ destination: "/b" });
    expect((await client.from("redirects").select("id", { count: "exact", head: true })).count).toBe(1);
    await seed();
    const { data: ventura } = await client.from<Row>("counties").insert({ slug: "ventura", name: "Ventura County", short_name: "Ventura", is_published: true }).select("id").single();
    const upd = await client.from<Row[]>("counties").update({ is_published: false }).eq("id", ventura!.id).select("slug, is_published");
    expect(upd.data).toEqual([{ slug: "ventura", is_published: false }]);
    expect((await client.from("counties").delete({ count: "exact" }).eq("is_published", false)).count).toBe(1);
    // A county with cities cannot be deleted (ON DELETE RESTRICT, as in Postgres).
    expect((await client.from("counties").delete().eq("slug", "orange")).error?.code).toBe("23503");
  });

  it("refuses UPDATE / DELETE without a filter", async () => {
    await seed();
    expect((await client.from("counties").delete()).error?.code).toBe("21000");
    expect((await client.from("counties").update({ region: "x" })).error?.code).toBe("21000");
    expect((await client.from("counties").select("id", { count: "exact", head: true })).count).toBe(2);
  });

  it("never rejects; throwOnError does", async () => {
    expect((await client.from("no_such_table").select("*")).error?.code).toBe("42P01");
    await expect(client.from("counties").insert({ name: "x" }).throwOnError()).rejects.toThrow();
  });

  it("touches updated_at on an update, unless the update sets it", async () => {
    const { la } = await seed();
    await client.from("counties").update({ updated_at: "2020-01-01T00:00:00.000Z" }).eq("id", la.id);
    const set = await client.from<Row>("counties").select("updated_at").eq("id", la.id).single();
    expect(set.data!.updated_at).toBe("2020-01-01T00:00:00.000Z");
    await client.from("counties").update({ region: "Southern" }).eq("id", la.id);
    const touched = await client.from<Row>("counties").select("updated_at").eq("id", la.id).single();
    expect(String(touched.data!.updated_at) > "2026-01-01").toBe(true);
  });

  it("keeps blog_posts.review_status in step with is_published", async () => {
    const post = { slug: "p", title: "P", body_md: "one two  three\nfour" };
    const { data } = await client.from<Row>("blog_posts").insert(post).select("id, review_status, is_published, word_count").single();
    expect(data).toMatchObject({ review_status: "draft", is_published: false });
    const id = data!.id as string;
    await client.from("blog_posts").update({ is_published: true }).eq("id", id);
    expect((await client.from<Row>("blog_posts").select("review_status").eq("id", id).single()).data).toEqual({ review_status: "published" });
    await client.from("blog_posts").update({ is_published: false }).eq("id", id);
    expect((await client.from<Row>("blog_posts").select("review_status").eq("id", id).single()).data).toEqual({ review_status: "approved" });
    const born = await client.from<Row>("blog_posts").insert({ ...post, slug: "q", is_published: true }).select("review_status").single();
    expect(born.data).toEqual({ review_status: "published" });
  });

  it("the keyword index is unique ignoring case", async () => {
    await client.from("content_topics").insert({ keyword: "Car accident lawyer" });
    expect((await client.from("content_topics").insert({ keyword: "car ACCIDENT lawyer" })).error?.code).toBe("23505");
  });
});

describe("rpc", () => {
  it("answers PGRST202 for the policy helpers, which belong to OPS-404", async () => {
    for (const name of ["is_admin", "is_owner", "is_editor", "no_such_function"]) {
      const res = await client.rpc(name, {});
      expect(res.error?.code).toBe("PGRST202");
      expect(res.data).toBeNull();
    }
  });

  it("answers the moved functions (OPS-364) by name", async () => {
    for (const name of ["bump_rate_limit", "claim_content_topics", "content_health_issues", "content_health_issues_unguarded", "bump_error_count", "error_counts_recent"]) {
      expect(RPCS[name], name).toBeTypeOf("function");
    }
  });
});

describe("transient D1 errors", () => {
  it("retries a read once and leaves writes alone", async () => {
    let selectCalls = 0;
    let writeCalls = 0;
    const base = fakeD1(raw);
    const flaky: D1Like = {
      ...base,
      prepare: (sql: string) => {
        const real = base.prepare(sql);
        const wrap = (s: D1Statement): D1Statement => ({
          ...s,
          bind: (...v: unknown[]) => wrap(s.bind(...v)),
          all: async <T,>() => {
            if (sql.startsWith("SELECT") && ++selectCalls === 1) throw new Error("D1_ERROR: Network connection lost.");
            return s.all<T>();
          },
          run: async () => {
            writeCalls++;
            throw new Error("D1_ERROR: Network connection lost.");
          },
        });
        return wrap(real);
      },
    };
    const c = createD1DataClient(async () => flaky);
    expect((await c.from<Row>("counties").select("id")).error).toBeNull();
    expect(selectCalls).toBe(2);
    const write = await c.from("counties").update({ name: "x" }).eq("id", "nope");
    expect(write.error?.message).toContain("D1_ERROR");
    expect(writeCalls).toBe(1);
  });

  it("recognises transient messages and rethrows the rest", async () => {
    expect(isTransientD1Error(new Error("D1_ERROR: internal error"))).toBe(true);
    expect(isTransientD1Error(new Error("no such column: foo"))).toBe(false);
    await expect(retryRead(async () => { throw new Error("no such column: foo"); }, 1)).rejects.toThrow("no such column");
  });
});
