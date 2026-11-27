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
  env: {} as Record<string, string>,
  site: { url: "http://localhost:3000" },
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: mocks.configured,
}));
vi.mock("@/lib/supabase/admin", () => ({
  getServiceSupabase: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.turnstile }));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/seo/canonical", () => ({ siteUrl: () => mocks.site.url }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/sms/twilio", () => ({ sendSms: vi.fn() }));
import { sendEmail } from "@/lib/email/resend";
import { sendSms } from "@/lib/sms/twilio";
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
    for (const k of Object.keys(mocks.env)) delete mocks.env[k];
    mocks.site.url = "http://localhost:3000";
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

// OPS-347: an enquiry still reaches the firm by email when the database does not answer.
describe("lead email fallback when the store fails (OPS-347)", () => {
  const sendEmailMock = vi.mocked(sendEmail);
  const sendSmsMock = vi.mocked(sendSms);
  let logs: ReturnType<typeof vi.spyOn>[];

  const everyLogLine = () =>
    logs
      .flatMap((spy) => spy.mock.calls)
      .map((args) => args.map((a: unknown) => String(a)).join(" "))
      .join("\n");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.LEAD_NOTIFY_EMAIL = "firm@example.test";
    mocks.configured.mockReturnValue(true);
    mocks.limit.mockResolvedValue({ allowed: true });
    mocks.turnstile.mockResolvedValue({ ok: true });
    mocks.single.mockResolvedValue({
      data: null,
      error: { message: "fixture failure" },
    });
    mocks.insert.mockReturnValue({
      select: () => ({ maybeSingle: mocks.single }),
    });
    mocks.audit.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => ({
      insert: table === "leads" ? mocks.insert : mocks.audit,
    }));
    sendEmailMock.mockResolvedValue({ ok: true, id: "email-1" });
    sendSmsMock.mockResolvedValue({ ok: true });
    logs = [
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "info").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
      vi.spyOn(console, "log").mockImplementation(() => {}),
    ];
    delete process.env.LEADS_FORCE_INSERT_FAIL;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.LEADS_FORCE_INSERT_FAIL;
    vi.restoreAllMocks();
  });

  it("emails the firm a NOT STORED message when the insert fails, and says received", async () => {
    const response = await POST(
      request({
        ...fixture,
        email: "visitor@example.test",
        description: "Rear-ended on the 134",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, persisted: false });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const mail = sendEmailMock.mock.calls[0][0];
    expect(mail.to).toBe("firm@example.test");
    expect(mail.subject).toBe(
      "NOT STORED, enter by hand: New lead: Test Fixture",
    );
    expect(mail.replyTo).toBe("visitor@example.test");
    expect(mail.html).toContain("exists only in this email");
    expect(mail.html).toContain("Enter it in the admin when the site is back.");
    expect(mail.html).toContain("+12025550123");
    expect(mail.html).toContain("Rear-ended on the 134");
    // The consent record: text, time and IP.
    expect(mail.html).toContain("Consent text");
    expect(mail.html).toContain("Consent time");
    expect(mail.html).toMatch(/Consent time<\/td><td>\d{4}-\d{2}-\d{2}T/);
    expect(mail.html).toMatch(/IP<\/td><td>unknown<\/td>/);
    // No admin link: the lead is not in the admin.
    expect(mail.html).not.toContain("/admin/leads/");
    // The SMS goes with it, as on the stored path.
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock.mock.calls[0][0].body).toContain("NOT STORED");
    // Nothing else was stored anywhere.
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("answers in about 5 seconds when the database hangs, with the same email", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mocks.single.mockReturnValue(new Promise(() => {}));
    let settled = false;
    const pending = POST(request()).then((r) => {
      settled = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(4999);
    expect(settled).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, persisted: false });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toMatch(
      /^NOT STORED, enter by hand/,
    );
    expect(sendSmsMock).toHaveBeenCalledTimes(1);
  });

  it("falls back when a lookup hangs or the client throws", async () => {
    mocks.from.mockImplementation(() => {
      throw new Error("fixture: database client unavailable");
    });
    const response = await POST(
      request({ ...fixture, practice_area: "car-accidents" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, persisted: false });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("answers 500 as before when the fallback email fails too", async () => {
    sendEmailMock.mockResolvedValue({ ok: false, error: "fixture" });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "db-insert-failed",
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
    sendEmailMock.mockRejectedValue(new Error("fixture"));
    expect((await POST(request())).status).toBe(500);
  });

  it("answers 500 when the fallback email does not answer in time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sendEmailMock.mockReturnValue(new Promise(() => {}));
    const pending = POST(request());
    await vi.advanceTimersByTimeAsync(5000 + 8000);
    const response = await pending;
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "db-insert-failed",
    });
  });

  it("sends nothing for a spam lead, and for a site with no notify address", async () => {
    expect(
      (await POST(request({ ...fixture, company: "honeypot" }))).status,
    ).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
    delete mocks.env.LEAD_NOTIFY_EMAIL;
    expect((await POST(request())).status).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("still refuses on the rate limit, validation and the verification check first", async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    expect((await POST(request())).status).toBe(429);
    mocks.limit.mockResolvedValue({ allowed: true });
    expect(
      (await POST(request({ ...fixture, consent_contact: false }))).status,
    ).toBe(400);
    mocks.turnstile.mockResolvedValue({
      ok: false,
      reason: "invalid-input-response",
    });
    expect((await POST(request())).status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps the stored path as it was: one normal email with the admin link after a good insert", async () => {
    mocks.single.mockResolvedValue({
      data: { id: "stored-id-1" },
      error: null,
    });
    const response = await POST(request());
    expect(await response.json()).toEqual({ ok: true, persisted: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const mail = sendEmailMock.mock.calls[0][0];
    expect(mail.subject).toBe("New lead: Test Fixture");
    expect(mail.html).toContain("/admin/leads/stored-id-1");
    expect(mail.html).not.toContain("NOT STORED");
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it("writes one fixed log line for the fallback and no name, contact or text of the lead", async () => {
    await POST(
      request({
        ...fixture,
        email: "visitor@example.test",
        description: "Private details of the crash",
      }),
    );
    const text = everyLogLine();
    expect(text).toContain("[leads] insert failed, sent by email only");
    for (const secret of [
      "Test Fixture",
      "202-555-0123",
      "visitor@example.test",
      "Private details",
      "private-stored-id",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("the staging switch fails the insert on purpose on staging only, without touching the database", async () => {
    process.env.LEADS_FORCE_INSERT_FAIL = "1";
    mocks.single.mockResolvedValue({
      data: { id: "would-be-stored" },
      error: null,
    });

    mocks.site.url = "https://staging.mmg-lawfirm.com";
    const staged = await POST(request());
    expect(await staged.json()).toEqual({ ok: true, persisted: false });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toMatch(/^NOT STORED/);

    // Production ignores the variable even when it is set.
    vi.clearAllMocks();
    sendEmailMock.mockResolvedValue({ ok: true });
    mocks.site.url = "https://www.mmg-lawfirm.com";
    const live = await POST(request());
    expect(await live.json()).toEqual({ ok: true, persisted: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].subject).toBe(
      "New lead: Test Fixture",
    );
  });
});
