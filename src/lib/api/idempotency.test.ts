import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  principal: string;
  idem_key: string;
  request_hash: string;
  state: string;
  response_status: number | null;
  response_body: unknown;
  expires_at: string;
};
const rows: Row[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  getServiceSupabase: () => ({
    from() {
      const filters: Record<string, unknown> = {};
      const ltFilters: Record<string, string> = {};
      let op: "select" | "insert" | "update" | "delete" = "select";
      let payload: Record<string, unknown> = {};
      const match = (r: Row) =>
        Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v) &&
        Object.entries(ltFilters).every(([k, v]) => String((r as Record<string, unknown>)[k]) < v);
      const run = () => {
        if (op === "insert") {
          const dup = rows.find(
            (r) => r.principal === payload.principal && r.idem_key === payload.idem_key,
          );
          if (dup) return { data: null, error: { code: "23505", message: "dup" } };
          rows.push({ ...(payload as Row), response_status: null, response_body: null });
          return { data: null, error: null };
        }
        if (op === "update") {
          rows.filter(match).forEach((r) => Object.assign(r, payload));
          return { data: null, error: null };
        }
        if (op === "delete") {
          for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) rows.splice(i, 1);
          return { data: null, error: null };
        }
        return { data: rows.filter(match), error: null };
      };
      const b = {
        insert(p: Record<string, unknown>) { op = "insert"; payload = p; return b; },
        update(p: Record<string, unknown>) { op = "update"; payload = p; return b; },
        delete() { op = "delete"; return b; },
        select() { return b; },
        eq(k: string, v: unknown) { filters[k] = v; return b; },
        lt(k: string, v: string) { ltFilters[k] = v; return b; },
        maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : null, error: r.error }; },
        then(resolve: (v: unknown) => void) { resolve(run()); },
      };
      return b;
    },
  }),
}));

import type { ApiPrincipal } from "./auth";
import { withIdempotency } from "./idempotency";

const principal: ApiPrincipal = {
  kind: "key", id: "k1", name: "k", prefix: "p", scopes: new Set(["*"]), rateLimitPerHour: 600,
};

function req(key: string | undefined, body: string): Request {
  return new Request("https://x.test/api/admin/blog", {
    method: "POST",
    headers: key ? { "idempotency-key": key } : {},
    body,
  });
}

beforeEach(() => { rows.length = 0; });

describe("withIdempotency", () => {
  it("runs the handler directly without a key", async () => {
    const h = vi.fn(async () => new Response("{}", { status: 201 }));
    const r = await withIdempotency(req(undefined, "{}"), principal, "{}", h);
    expect(r.status).toBe(201);
    expect(h).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(0);
  });

  it("stores and replays a successful response", async () => {
    const h = vi.fn(async () => new Response(JSON.stringify({ post: { id: "p1" } }), { status: 201 }));
    const body = '{"title":"x"}';
    const first = await withIdempotency(req("abc", body), principal, body, h);
    expect(first.status).toBe(201);
    expect(rows[0].state).toBe("done");

    const second = await withIdempotency(req("abc", body), principal, body, h);
    expect(h).toHaveBeenCalledTimes(1);
    expect(second.status).toBe(201);
    expect(second.headers.get("idempotency-replayed")).toBe("true");
    expect(await second.json()).toEqual({ post: { id: "p1" } });
  });

  it("422 when the same key is reused with a different payload", async () => {
    const h = async () => new Response("{}", { status: 201 });
    await withIdempotency(req("abc", "{\"a\":1}"), principal, "{\"a\":1}", h);
    const r = await withIdempotency(req("abc", "{\"a\":2}"), principal, "{\"a\":2}", h);
    expect(r.status).toBe(422);
  });

  it("409 while the first request is still in progress", async () => {
    rows.push({ principal: "k1", idem_key: "abc", request_hash: "", state: "in_progress", response_status: null, response_body: null, expires_at: new Date(Date.now() + 1e6).toISOString() });
    // hash must match → compute via a first call's semantics: easier to assert 422 vs 409 split by matching hash
    const { requestHash } = await import("./idempotency");
    rows[0].request_hash = requestHash("POST", "/api/admin/blog", "{}");
    const r = await withIdempotency(req("abc", "{}"), principal, "{}", async () => new Response("{}"));
    expect(r.status).toBe(409);
  });

  it("does not store 5xx responses", async () => {
    const h = vi.fn(async () => new Response("{\"error\":\"boom\"}", { status: 500 }));
    const r = await withIdempotency(req("abc", "{}"), principal, "{}", h);
    expect(r.status).toBe(500);
    expect(rows).toHaveLength(0);
    await withIdempotency(req("abc", "{}"), principal, "{}", h);
    expect(h).toHaveBeenCalledTimes(2);
  });

  it("rejects keys over 128 chars", async () => {
    const r = await withIdempotency(req("x".repeat(129), "{}"), principal, "{}", async () => new Response("{}"));
    expect(r.status).toBe(400);
  });
});
