import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  limit: vi.fn(),
  turnstile: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: mocks.configured,
}));
vi.mock("@/lib/supabase/admin", () => ({
  getServiceSupabase: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.turnstile }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/sms/twilio", () => ({ sendSms: vi.fn() }));
import { POST } from "./route";

const fixture = {
  full_name: "Test Fixture",
  phone: "202-555-0123",
  consent_contact: true,
  turnstileToken: "unit-test-only",
};
function request(body: unknown = fixture) {
  return new NextRequest("https://example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("lead persistence acknowledgement (all transports mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.limit.mockResolvedValue({ allowed: true });
    mocks.turnstile.mockResolvedValue({ ok: true });
    mocks.single.mockResolvedValue({
      data: { id: "private-stored-id" },
      error: null,
    });
    mocks.insert.mockReturnValue({
      select: () => ({ maybeSingle: mocks.single }),
    });
    mocks.audit.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => ({
      insert: table === "leads" ? mocks.insert : mocks.audit,
    }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("acknowledges only an inserted row, without exposing its ID", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, persisted: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.turnstile).toHaveBeenCalledTimes(1);
  });
  it("does not acknowledge the unconfigured stub", async () => {
    mocks.configured.mockReturnValue(false);
    expect(await (await POST(request())).json()).toEqual({
      ok: true,
      persisted: false,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("does not assume storage when the insert returns no row", async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect(await (await POST(request())).json()).toEqual({
      ok: true,
      persisted: false,
    });
  });
  it("preserves database failure", async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: { message: "fixture failure" },
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "db-insert-failed",
    });
  });
  it("preserves rate limiting without storage", async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 3600 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("preserves validation and CAPTCHA rejection", async () => {
    expect(
      (await POST(request({ ...fixture, consent_contact: false }))).status,
    ).toBe(400);
    mocks.turnstile.mockResolvedValue({
      ok: false,
      reason: "invalid-input-response",
    });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("does not reveal the preserved spam classification", async () => {
    expect(
      await (await POST(request({ ...fixture, company: "honeypot" }))).json(),
    ).toEqual({ ok: true, persisted: true });
    expect(mocks.insert.mock.calls[0][0].status).toBe("spam");
  });
});
