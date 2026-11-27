import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APP_DEADLINE_MS, handleLeadPost, LATE_WAIT_MS, MAX_BODY_BYTES, type HoldEnv } from "./lead-hold";

const WWW = "https://www.mmg-lawfirm.com/api/leads";
const STAGING = "https://staging.mmg-lawfirm.com/api/leads";

const LEAD = {
  full_name: "Test Person",
  phone: "+15555550123",
  email: "test.person@example.test",
  description: "Rear-ended on the 134, neck pain.",
  turnstileToken: "token-abc",
  consent: true,
};

function post(url = WWW, body: unknown = LEAD, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.9",
      "user-agent": "vitest-agent",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function bucket(opts: { failPut?: boolean } = {}) {
  const objects = new Map<string, string>();
  return {
    objects,
    put: vi.fn(async (key: string, value: string) => {
      if (opts.failPut) throw new Error("r2 down");
      objects.set(key, value);
    }),
    delete: vi.fn(async (key: string) => void objects.delete(key)),
  };
}

const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function env(app: (req: Request) => Promise<Response>, b = bucket(), extra: Partial<HoldEnv> = {}) {
  const fetch = vi.fn(app);
  return { env: { APP: { fetch }, PAGES: b, ...extra } satisfies HoldEnv, fetch, bucket: b };
}

function ctx() {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    settle: async () => {
      while (pending.length) await Promise.all(pending.splice(0));
    },
  };
}

describe("handleLeadPost", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("1. holds an enquiry when the app answers 500 db-insert-failed, then thanks the visitor", async () => {
    const e = env(async () => answer(500, { ok: false, error: "db-insert-failed" }));
    const res = await handleLeadPost(post(), e.env, ctx(), () => Date.UTC(2026, 10, 27, 20, 0, 0));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, persisted: false });
    expect(e.bucket.put).toHaveBeenCalledTimes(1);
    const [key, raw] = e.bucket.put.mock.calls[0]!;
    expect(key).toMatch(/^held-leads\/2026-11-27\/[0-9a-f-]{36}\.json$/);
    const held = JSON.parse(raw as string);
    expect(held.v).toBe(1);
    expect(held.reason).toBe("db-insert-failed");
    expect(held.receivedAt).toBe("2026-11-27T20:00:00.000Z");
    expect(held.lead.full_name).toBe("Test Person");
    expect(held.lead.description).toBe("Rear-ended on the 134, neck pain.");
    expect(held.lead.turnstileToken).toBeUndefined();
    expect(held.consent).toEqual({ ip: "203.0.113.9", userAgent: "vitest-agent" });
    expect(JSON.stringify(held)).not.toContain("token-abc");
  });

  it("2. returns the app's 500 unchanged when the hold itself cannot be written", async () => {
    const e = env(async () => answer(500, { ok: false, error: "db-insert-failed" }), bucket({ failPut: true }));
    const res = await handleLeadPost(post(), e.env, ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "db-insert-failed" });
  });

  it("3. passes a stored lead through: no hold, answer unchanged", async () => {
    const e = env(async () => answer(200, { ok: true, persisted: true }));
    const res = await handleLeadPost(post(), e.env, ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, persisted: true });
    expect(e.bucket.put).not.toHaveBeenCalled();
  });

  it.each([
    ["4. validation", 400, { ok: false, error: "validation-failed" }],
    ["5. turnstile", 400, { ok: false, error: "turnstile-failed", reason: "invalid" }],
    ["6. rate limit", 429, { ok: false, error: "rate-limited", retryAfterSeconds: 60 }],
    ["7. another 500", 500, { ok: false, error: "something-else" }],
  ])("%s: unchanged, nothing held", async (_name, status, body) => {
    const e = env(async () => answer(status, body));
    const res = await handleLeadPost(post(), e.env, ctx());
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual(body);
    expect(e.bucket.put).not.toHaveBeenCalled();
  });

  it("8. holds when the app is slower than 15 s, answers by then, and drops the copy once the app says 400", async () => {
    let finish!: (r: Response) => void;
    const slow = new Promise<Response>((resolve) => (finish = resolve));
    const e = env(() => slow);
    const c = ctx();
    const pending = handleLeadPost(post(), e.env, c);
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    const res = await pending;
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, persisted: false });
    expect(e.bucket.put).toHaveBeenCalledTimes(1);
    expect(JSON.parse(e.bucket.put.mock.calls[0]![1] as string).reason).toBe("app-timeout");
    expect(e.bucket.objects.size).toBe(1);

    finish(answer(400, { ok: false, error: "turnstile-failed" }));
    await c.settle();
    expect(e.bucket.delete).toHaveBeenCalledTimes(1);
    expect(e.bucket.objects.size).toBe(0);
  });

  it("8b. a slow app that then stores the lead also drops the copy", async () => {
    let finish!: (r: Response) => void;
    const e = env(() => new Promise<Response>((resolve) => (finish = resolve)));
    const c = ctx();
    const pending = handleLeadPost(post(), e.env, c);
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    await pending;
    finish(answer(200, { ok: true, persisted: true }));
    await c.settle();
    expect(e.bucket.objects.size).toBe(0);
  });

  it("8c. a slow app that never answers within 25 s more keeps the copy", async () => {
    const e = env(() => new Promise<Response>(() => undefined));
    const c = ctx();
    const pending = handleLeadPost(post(), e.env, c);
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    await pending;
    await vi.advanceTimersByTimeAsync(LATE_WAIT_MS);
    await c.settle();
    expect(e.bucket.objects.size).toBe(1);
    expect(e.bucket.delete).not.toHaveBeenCalled();
  });

  it("9. a slow app that then answers 500 db-insert-failed keeps the copy", async () => {
    let finish!: (r: Response) => void;
    const e = env(() => new Promise<Response>((resolve) => (finish = resolve)));
    const c = ctx();
    const pending = handleLeadPost(post(), e.env, c);
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    await pending;
    finish(answer(500, { ok: false, error: "db-insert-failed" }));
    await c.settle();
    expect(e.bucket.objects.size).toBe(1);
    expect(e.bucket.delete).not.toHaveBeenCalled();
  });

  it("9b. a slow app and a failing put: 503, never a thank-you", async () => {
    const e = env(() => new Promise<Response>(() => undefined), bucket({ failPut: true }));
    const pending = handleLeadPost(post(), e.env, ctx());
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    const res = await pending;
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "db-insert-failed" });
  });

  it("10. forwards an oversized body and a non-JSON body unchanged, with the body intact", async () => {
    const seen: string[] = [];
    const e = env(async (req) => {
      seen.push(await req.text());
      return answer(500, { ok: false, error: "db-insert-failed" });
    });
    const big = JSON.stringify({ ...LEAD, description: "x".repeat(MAX_BODY_BYTES) });
    const r1 = await handleLeadPost(post(WWW, big), e.env, ctx());
    const r2 = await handleLeadPost(post(WWW, "{"), e.env, ctx());
    const r3 = await handleLeadPost(post(WWW, "[1,2]"), e.env, ctx());
    expect([r1.status, r2.status, r3.status]).toEqual([500, 500, 500]);
    expect(seen).toEqual([big, "{", "[1,2]"]);
    expect(e.bucket.put).not.toHaveBeenCalled();
  });

  it("10b. forwards the request with the same method, URL and headers", async () => {
    const e = env(async () => answer(200, { ok: true, persisted: true }));
    await handleLeadPost(post(WWW, LEAD, { "x-custom": "1" }), e.env, ctx());
    const sent = e.fetch.mock.calls[0]![0];
    expect(sent.method).toBe("POST");
    expect(sent.url).toBe(WWW);
    expect(sent.headers.get("x-custom")).toBe("1");
    expect(JSON.parse(await sent.text())).toEqual(LEAD);
  });

  it("11. the self test needs the var, the exact staging host and the header", async () => {
    const hit = env(async () => answer(200, { ok: true, persisted: true }), bucket(), { HOLD_SELFTEST: "1" });
    const res = await handleLeadPost(post(STAGING, LEAD, { "x-hold-selftest": "1" }), hit.env, ctx());
    const body = (await res.json()) as { ok: boolean; persisted: boolean; selftest: string };
    expect(body.ok).toBe(true);
    expect(body.persisted).toBe(false);
    expect(body.selftest).toMatch(/^[0-9a-f-]{36}$/);
    expect(hit.fetch).not.toHaveBeenCalled();
    expect([...hit.bucket.objects.keys()]).toEqual([`held-leads/selftest/${body.selftest}.json`]);

    const cases: Array<[string, Partial<HoldEnv>, Record<string, string>]> = [
      [WWW, { HOLD_SELFTEST: "1" }, { "x-hold-selftest": "1" }],
      ["https://staging.mmg-lawfirm.com.example.test/api/leads", { HOLD_SELFTEST: "1" }, { "x-hold-selftest": "1" }],
      [STAGING, {}, { "x-hold-selftest": "1" }],
      [STAGING, { HOLD_SELFTEST: "1" }, {}],
    ];
    for (const [url, extra, headers] of cases) {
      const e = env(async () => answer(200, { ok: true, persisted: true }), bucket(), extra);
      const r = await handleLeadPost(post(url, LEAD, headers), e.env, ctx());
      expect(await r.json()).toEqual({ ok: true, persisted: true });
      expect(e.fetch).toHaveBeenCalledTimes(1);
      expect(e.bucket.put).not.toHaveBeenCalled();
    }
  });

  it("12. no log line carries the lead's name, phone, email, description or IP", async () => {
    const lines: string[] = [];
    for (const m of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void lines.push(a.map(String).join(" ")));
    }
    const e1 = env(async () => answer(500, { ok: false, error: "db-insert-failed" }));
    await handleLeadPost(post(), e1.env, ctx());
    const e2 = env(async () => answer(500, { ok: false, error: "db-insert-failed" }), bucket({ failPut: true }));
    await handleLeadPost(post(), e2.env, ctx());
    let finish!: (r: Response) => void;
    const e3 = env(() => new Promise<Response>((resolve) => (finish = resolve)));
    const c = ctx();
    const pending = handleLeadPost(post(), e3.env, c);
    await vi.advanceTimersByTimeAsync(APP_DEADLINE_MS);
    await pending;
    finish(answer(400, { ok: false }));
    await c.settle();

    expect(lines.length).toBeGreaterThan(0);
    const all = lines.join("\n");
    for (const secret of ["Test Person", "+15555550123", "test.person@example.test", "Rear-ended", "203.0.113.9", "held-leads/", "token-abc"]) {
      expect(all).not.toContain(secret);
    }
    expect(all).toContain("[lead-hold] held reason=db-insert-failed");
    expect(all).toContain("[lead-hold] put failed");
    expect(all).toContain("[lead-hold] released status=400");
  });
});
