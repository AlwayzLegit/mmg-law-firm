import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createD1DataClient, type D1Like, type D1Statement } from "@/lib/db/d1Client";

// The Postgres functions moved to code for D1 (OPS-364), against the real
// schema (migrations/d1/0001_schema.sql) in Node's built-in SQLite.

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
let raw: DatabaseSync;
let client: ReturnType<typeof createD1DataClient>;

beforeEach(() => {
  raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  raw.exec(SCHEMA_SQL);
  client = createD1DataClient(async () => fakeD1(raw));
});

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("bump_rate_limit", () => {
  it("counts 1, 2, 3 inside the window and starts again at 1 after it", async () => {
    const call = () => client.rpc<{ count: number; window_started_at: string }>("bump_rate_limit", { p_key: "leads:1.2.3.4", p_window_seconds: 3600 }).maybeSingle();
    const first = await call();
    expect(first.error).toBeNull();
    expect(first.data?.count).toBe(1);
    expect((await call()).data?.count).toBe(2);
    const third = await call();
    expect(third.data?.count).toBe(3);
    expect(third.data?.window_started_at).toBe(first.data?.window_started_at);
    // The window ran out two hours ago: the next call resets it.
    raw.prepare("UPDATE rate_limits SET window_started_at = ? WHERE key = ?").run(iso(2 * HOUR), "leads:1.2.3.4");
    const reset = await call();
    expect(reset.data?.count).toBe(1);
    expect(Date.parse(String(reset.data?.window_started_at))).toBeGreaterThan(Date.now() - 60_000);
  });

  it("keeps one row per key and returns an array when not asked for one row", async () => {
    await client.rpc("bump_rate_limit", { p_key: "a", p_window_seconds: 60 });
    const b = await client.rpc<Row[]>("bump_rate_limit", { p_key: "b", p_window_seconds: 60 });
    expect(b.data).toEqual([{ count: 1, window_started_at: expect.any(String) }]);
    expect(raw.prepare("SELECT count(*) AS n FROM rate_limits").get()).toEqual({ n: 2 });
  });

  it("refuses a missing key or window with an error, never a throw", async () => {
    expect((await client.rpc("bump_rate_limit", { p_window_seconds: 60 })).error?.code).toBe("22023");
    expect((await client.rpc("bump_rate_limit", { p_key: "a" })).error?.code).toBe("22023");
  });
});

describe("claim_content_topics", () => {
  const run = () => {
    const id = crypto.randomUUID();
    raw.prepare("INSERT INTO agent_runs (id, agent_name) VALUES (?, 'test')").run(id);
    return id;
  };
  const topic = (keyword: string, priority: number, createdMsAgo: number, status = "queued") => {
    const id = crypto.randomUUID();
    raw
      .prepare("INSERT INTO content_topics (id, keyword, priority, status, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, keyword, priority, status, iso(createdMsAgo));
    return id;
  };

  it("hands out queued topics by priority then age, never the same one twice", async () => {
    const low = topic("c", 80, 3 * DAY);
    const best = topic("a", 10, 1 * DAY);
    const older = topic("b", 10, 2 * DAY);
    topic("done", 1, 5 * DAY, "published");
    const r1 = run();
    const r2 = run();

    const first = await client.rpc<Row[]>("claim_content_topics", { p_run_id: r1, p_limit: 2, p_topic_ids: null });
    expect(first.error).toBeNull();
    expect((first.data ?? []).map((t) => t.id)).toEqual([older, best]);
    expect(first.data?.[0]).toMatchObject({ status: "claimed", claimed_by_run_id: r1, keyword: "b" });
    expect(first.data?.[0].claimed_at).toEqual(expect.any(String));

    const second = await client.rpc<Row[]>("claim_content_topics", { p_run_id: r2, p_limit: 2, p_topic_ids: null });
    expect((second.data ?? []).map((t) => t.id)).toEqual([low]);
    const none = await client.rpc<Row[]>("claim_content_topics", { p_run_id: r2, p_limit: 5 });
    expect(none.data).toEqual([]);
    expect(raw.prepare("SELECT count(*) AS n FROM content_topics WHERE status = 'claimed'").get()).toEqual({ n: 3 });
  });

  it("two claims started together never share a topic", async () => {
    for (let i = 0; i < 6; i++) topic(`k${i}`, 50, i * HOUR);
    const [a, b] = await Promise.all([
      client.rpc<Row[]>("claim_content_topics", { p_run_id: run(), p_limit: 4 }),
      client.rpc<Row[]>("claim_content_topics", { p_run_id: run(), p_limit: 4 }),
    ]);
    const ids = [...(a.data ?? []), ...(b.data ?? [])].map((t) => t.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it("narrows to p_topic_ids and treats a limit of 0, below 0 or null as nothing", async () => {
    const a = topic("a", 10, DAY);
    const b = topic("b", 20, DAY);
    topic("c", 30, DAY);
    const r = run();
    for (const limit of [0, -3, null]) {
      expect((await client.rpc<Row[]>("claim_content_topics", { p_run_id: r, p_limit: limit })).data).toEqual([]);
    }
    const picked = await client.rpc<Row[]>("claim_content_topics", { p_run_id: r, p_limit: 5, p_topic_ids: [b, "not-a-topic"] });
    expect((picked.data ?? []).map((t) => t.id)).toEqual([b]);
    expect(raw.prepare("SELECT status FROM content_topics WHERE id = ?").get(a)).toEqual({ status: "queued" });
  });

  it("refuses a bad run id or id list with an error", async () => {
    expect((await client.rpc("claim_content_topics", { p_limit: 1 })).error?.code).toBe("22023");
    expect((await client.rpc("claim_content_topics", { p_run_id: run(), p_limit: 1, p_topic_ids: "x" })).error?.code).toBe("22023");
  });
});

describe("error counts", () => {
  it("bump_error_count adds one per environment, route and hour; error_counts_recent reads them back", async () => {
    for (let i = 0; i < 3; i++) expect((await client.rpc("bump_error_count", { p_env: "production", p_route: "/api/leads" })).error).toBeNull();
    await client.rpc("bump_error_count", { p_env: "production", p_route: "/contact" });
    await client.rpc("bump_error_count", { p_env: "staging", p_route: "/contact" });
    const prod = await client.rpc<Row[]>("error_counts_recent", { p_env: "production" }).single();
    expect(prod.data).toEqual({ errors24h: 4, errors3h: 4 });
    expect((await client.rpc("error_counts_recent", { p_env: "staging" }).single()).data).toEqual({ errors24h: 1, errors3h: 1 });
    expect((await client.rpc("error_counts_recent", { p_env: "nothing" }).single()).data).toEqual({ errors24h: 0, errors3h: 0 });
  });

  it("ignores another environment or a route that is not /word or /word/word", async () => {
    const calls: Array<[string, string]> = [
      ["development", "/contact"],
      ["production", "contact"],
      ["production", "/Contact"],
      ["production", "/a/b/c"],
      ["production", "/" + "a".repeat(60)],
      ["production", "/contact?x=1"],
    ];
    for (const [p_env, p_route] of calls) {
      const res = await client.rpc("bump_error_count", { p_env, p_route });
      expect(res.error).toBeNull();
      expect(res.data).toBeNull();
    }
    expect(raw.prepare("SELECT count(*) AS n FROM error_counts").get()).toEqual({ n: 0 });
    // The longest allowed route (60 characters) is kept.
    await client.rpc("bump_error_count", { p_env: "production", p_route: "/" + "a".repeat(59) });
    expect(raw.prepare("SELECT count(*) AS n FROM error_counts").get()).toEqual({ n: 1 });
  });

  it("counts the 24 hour and 3 hour windows apart and drops rows older than 30 days", async () => {
    const ins = raw.prepare("INSERT INTO error_counts (env, route, hour, count) VALUES ('production', ?, ?, ?)");
    ins.run("/old", iso(31 * DAY), 9);
    ins.run("/day", iso(10 * HOUR), 5);
    ins.run("/recent", iso(1 * HOUR), 2);
    ins.run("/yesterday", iso(26 * HOUR), 7);
    expect((await client.rpc("error_counts_recent", { p_env: "production" }).single()).data).toEqual({ errors24h: 7, errors3h: 2 });
    await client.rpc("bump_error_count", { p_env: "production", p_route: "/now" });
    expect(raw.prepare("SELECT count(*) AS n FROM error_counts WHERE route = '/old'").get()).toEqual({ n: 0 });
    expect(raw.prepare("SELECT count(*) AS n FROM error_counts WHERE route = '/yesterday'").get()).toEqual({ n: 1 });
  });
});

describe("content_health_issues", () => {
  const long = (n: number) => "x".repeat(n);
  async function seed() {
    const ins = async (table: string, rows: Row | Row[]) => {
      const res = await client.from<Row[]>(table).insert(rows).select();
      expect(res.error).toBeNull();
      return res.data as Row[];
    };
    const [county] = await ins("counties", [{ slug: "la", name: "Los Angeles County", short_name: "LA", is_published: true, meta_description: long(170), intro_md: "short" }]);
    const [city] = await ins("cities", [{ county_id: county.id, slug: "glendale", name: "Glendale", is_published: true }]);
    const [pa] = await ins("practice_areas", [{ slug: "car", name: "Car Accident", short_name: "Car", noun_singular: "c", noun_plural: "c", lawyer_phrase: "l", is_published: true, meta_description: "" }]);
    const [pa2] = await ins("practice_areas", [{ slug: "truck", name: "Truck", short_name: "Truck", noun_singular: "t", noun_plural: "t", lawyer_phrase: "l", is_published: true, meta_description: long(161) }]);
    await ins("location_pages", [
      { city_id: city.id, practice_area_id: pa.id, is_published: true, local_angle_md: "tiny" },
      { city_id: city.id, practice_area_id: pa2.id, is_published: false },
    ]);
    await ins("blog_posts", [
      { slug: "thin", title: "Thin post", body_md: "short", is_published: true },
      { slug: "good", title: "Good post", body_md: long(600), meta_description: "ok", is_published: true },
      { slug: "draft", title: "Draft", body_md: "x", is_published: false },
    ]);
  }

  const expected = [
    ["location_page", "Glendale · Car Accident", "Missing meta description", "high"],
    ["location_page", "Glendale · Car Accident", "Thin local angle (4 chars)", "medium"],
    ["location_page", "Glendale · Truck", "Draft — needs local angle to publish", "low"],
    ["county", "Los Angeles County", "Meta too long (170 chars)", "medium"],
    ["county", "Los Angeles County", "Thin intro (5 chars)", "low"],
    ["practice_area", "Car Accident", "Missing meta description", "high"],
    ["practice_area", "Truck", "Meta too long (161 chars)", "medium"],
    ["blog", "Thin post", "Missing meta description", "high"],
    ["blog", "Thin post", "Thin body (5 chars)", "low"],
  ];

  it("lists the same issues as the Postgres function, with its labels and severities", async () => {
    await seed();
    const res = await client.rpc<Row[]>("content_health_issues_unguarded");
    expect(res.error).toBeNull();
    const got = (res.data ?? []).map((r) => [r.entity, r.label, r.issue, r.severity]);
    expect(got).toEqual(expected);
    for (const r of res.data ?? []) expect(r.entity_id).toEqual(expect.any(String));
  });

  it("flags a published location page that has not been reviewed for a year", async () => {
    await seed();
    raw.prepare("UPDATE location_pages SET last_reviewed_at = ? WHERE is_published = 1").run(iso(400 * DAY));
    const res = await client.rpc<Row[]>("content_health_issues_unguarded");
    expect((res.data ?? []).filter((r) => r.issue === "Overdue for review").map((r) => r.label)).toEqual(["Glendale · Car Accident"]);
    raw.prepare("UPDATE location_pages SET last_reviewed_at = ? WHERE is_published = 1").run(iso(30 * DAY));
    const fresh = await client.rpc<Row[]>("content_health_issues_unguarded");
    expect((fresh.data ?? []).some((r) => r.issue === "Overdue for review")).toBe(false);
  });

  it("returns an empty list on an empty database, and content_health_issues matches the unguarded one", async () => {
    expect((await client.rpc("content_health_issues")).data).toEqual([]);
    await seed();
    const a = await client.rpc("content_health_issues");
    const b = await client.rpc("content_health_issues_unguarded");
    expect(a.data).toEqual(b.data);
  });
});

describe("triggers of the D1 schema that replace the Postgres ones", () => {
  it("an update moves updated_at on a table that has one", async () => {
    const { data } = await client.from<Row>("counties").insert({ slug: "la", name: "LA", short_name: "LA" }).select("id").single();
    raw.prepare("UPDATE counties SET updated_at = ? WHERE id = ?").run(iso(DAY), data!.id);
    const before = (await client.from<Row>("counties").select("updated_at").eq("id", data!.id).single()).data!;
    await client.from("counties").update({ region: "x" }).eq("id", data!.id);
    const after = (await client.from<Row>("counties").select("updated_at").eq("id", data!.id).single()).data!;
    expect(String(after.updated_at) > String(before.updated_at)).toBe(true);
  });

  it("publishing a blog post sets review_status to published, unpublishing sets it to approved", async () => {
    const ins = await client.from<Row>("blog_posts").insert({ slug: "p", title: "P", body_md: "body", review_status: "approved" }).select("id, review_status").single();
    expect(ins.data?.review_status).toBe("approved");
    const published = await client.from<Row>("blog_posts").update({ is_published: true }).eq("id", ins.data!.id).select("review_status").single();
    expect(published.data?.review_status).toBe("published");
    const back = await client.from<Row>("blog_posts").update({ is_published: false }).eq("id", ins.data!.id).select("review_status").single();
    expect(back.data?.review_status).toBe("approved");
  });
});

describe("rpc() the way supabase-js callers use it", () => {
  it(".single() answers PGRST116 for no rows or many, .maybeSingle() answers null for none", async () => {
    const none = await client.rpc("content_health_issues_unguarded").single();
    expect(none.error?.code).toBe("PGRST116");
    expect((await client.rpc("content_health_issues_unguarded").maybeSingle()).data).toBeNull();
  });

  it(".abortSignal() stops a call whose signal has already fired, with an error not a throw", async () => {
    const res = await client.rpc("error_counts_recent", { p_env: "production" }).abortSignal(AbortSignal.abort());
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });

  it(".abortSignal() settles a call that is still waiting for the binding when the signal fires (review finding on 263)", async () => {
    const hung = createD1DataClient(() => new Promise<D1Like>(() => {})); // the binding never arrives
    const ctl = new AbortController();
    const started = Date.now();
    const pending = hung.rpc("error_counts_recent", { p_env: "production" }).abortSignal(ctl.signal);
    setTimeout(() => ctl.abort(), 20);
    const res = await pending;
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it(".abortSignal() settles a call whose statement is still running, and a call that finishes first keeps its data and leaves no listener", async () => {
    const slowDb: D1Like = {
      prepare: () => ({
        bind() { return this; },
        all: () => new Promise(() => {}),
        run: () => new Promise(() => {}),
      }) as unknown as D1Statement,
      batch: () => new Promise(() => {}),
    };
    const ctl = new AbortController();
    const slow = createD1DataClient(async () => slowDb).rpc("bump_rate_limit", { p_key: "k", p_window_seconds: 60 }).abortSignal(ctl.signal);
    setTimeout(() => ctl.abort(), 20);
    expect((await slow).error).not.toBeNull();

    const fine = new AbortController();
    let added = 0;
    let removed = 0;
    const add = fine.signal.addEventListener.bind(fine.signal);
    const remove = fine.signal.removeEventListener.bind(fine.signal);
    fine.signal.addEventListener = ((...a: Parameters<typeof add>) => { added += 1; return add(...a); }) as typeof add;
    fine.signal.removeEventListener = ((...a: Parameters<typeof remove>) => { removed += 1; return remove(...a); }) as typeof remove;
    const ok = await client.rpc("error_counts_recent", { p_env: "production" }).abortSignal(fine.signal);
    expect(ok.error).toBeNull();
    expect(ok.data).toEqual([{ errors24h: 0, errors3h: 0 }]);
    expect(added).toBe(1);
    expect(removed).toBe(1);
  });
});
