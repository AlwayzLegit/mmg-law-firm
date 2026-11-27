import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  sendSms: vi.fn(),
  sendEmail: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
vi.mock("@/lib/sms/twilio", () => ({ sendSms: mocks.sendSms }));
vi.mock("@/lib/email/resend", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: async () => ({
    from: (table: string) =>
      table === "leads"
        ? {
            select: () => ({
              eq: () => ({ maybeSingle: mocks.maybeSingle }),
            }),
          }
        : { insert: mocks.insert },
  }),
}));

import { sendLeadMessage } from "./message-actions";

const LEAD_ID = "11111111-1111-4111-8111-111111111111";

function form(channel: "sms" | "email") {
  const f = new FormData();
  f.set("leadId", LEAD_ID);
  f.set("channel", channel);
  f.set("body", "Hello from the firm");
  return f;
}

describe("sendLeadMessage consent guard (OPS-410)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.sendSms.mockResolvedValue({ ok: true, sid: "SM1" });
    mocks.sendEmail.mockResolvedValue({ ok: true, id: "em1" });
  });

  it("refuses a text to a lead who did not agree to texts, and records nothing", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: LEAD_ID,
        full_name: "A",
        phone: "+12025550123",
        email: "a@example.test",
        consent_contact: false,
      },
      error: null,
    });
    const r = await sendLeadMessage(form("sms"));
    expect(r).toEqual({
      ok: false,
      error: "This lead did not agree to texts. Call or email instead.",
    });
    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("sends a text to a lead who agreed", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: LEAD_ID,
        full_name: "A",
        phone: "+12025550123",
        email: null,
        consent_contact: true,
      },
      error: null,
    });
    const r = await sendLeadMessage(form("sms"));
    expect(r).toEqual({ ok: true });
    expect(mocks.sendSms).toHaveBeenCalledTimes(1);
  });

  it("leaves email unchanged for a lead without text consent", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: LEAD_ID,
        full_name: "A",
        phone: "+12025550123",
        email: "a@example.test",
        consent_contact: false,
      },
      error: null,
    });
    const r = await sendLeadMessage(form("email"));
    expect(r).toEqual({ ok: true });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendSms).not.toHaveBeenCalled();
  });
});
