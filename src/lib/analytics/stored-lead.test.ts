import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordStoredLead } from "./stored-lead";

describe("stored-lead Google event", () => {
  const gtag = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TESTONLY");
    vi.stubGlobal("window", {
      gtag,
      location: {
        href: "https://www.example.test/contact?email=private@example.test#private",
      },
    });
    vi.stubGlobal("document", {
      title: "Private user-provided title",
      referrer: "https://search.example.test/private-name?q=private#private",
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends only allowlisted fields after explicit storage acknowledgement", async () => {
    await recordStoredLead(
      Response.json({
        ok: true,
        persisted: true,
        id: "private-id",
        email: "private@example.test",
        description: "Private narrative",
        status: "spam",
      }),
    );
    expect(gtag).toHaveBeenCalledExactlyOnceWith("event", "generate_lead", {
      send_to: "G-TESTONLY",
      page_location: "https://www.example.test/contact",
      page_referrer: "https://search.example.test",
      page_title: "Consultation request",
    });
  });

  it.each([
    { ok: true },
    { ok: true, persisted: false },
    { ok: false, persisted: true },
    { ok: true, persisted: "true" },
    null,
    [],
    "ok",
  ])("does not count an unconfirmed response: %j", async (body) => {
    await recordStoredLead(Response.json(body));
    expect(gtag).not.toHaveBeenCalled();
  });

  it.each([400, 429, 500])("never counts HTTP %i", async (status) => {
    await recordStoredLead(
      Response.json({ ok: true, persisted: true }, { status }),
    );
    expect(gtag).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent callbacks for the same response", async () => {
    const response = Response.json({ ok: true, persisted: true });
    await Promise.all([recordStoredLead(response), recordStoredLead(response)]);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("does not collapse two separate stored submissions", async () => {
    await recordStoredLead(Response.json({ ok: true, persisted: true }));
    await recordStoredLead(Response.json({ ok: true, persisted: true }));
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it("ignores malformed JSON", async () => {
    await expect(
      recordStoredLead(new Response("not json")),
    ).resolves.toBeUndefined();
    expect(gtag).not.toHaveBeenCalled();
  });

  it.each(["", "not a URL", "javascript:private"])(
    "omits unsafe referrers: %s",
    async (referrer) => {
      vi.stubGlobal("document", { referrer });
      await recordStoredLead(Response.json({ ok: true, persisted: true }));
      expect(gtag.mock.calls[0][2].page_referrer).toBe("");
    },
  );

  it("does not create a tag when analytics is unavailable", async () => {
    delete window.gtag;
    await expect(
      recordStoredLead(Response.json({ ok: true, persisted: true })),
    ).resolves.toBeUndefined();
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not send without the configured stream", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    await recordStoredLead(Response.json({ ok: true, persisted: true }));
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not throw during SSR or a blocked tag", async () => {
    gtag.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    await expect(
      recordStoredLead(Response.json({ ok: true, persisted: true })),
    ).resolves.toBeUndefined();
    vi.stubGlobal("window", undefined);
    await expect(
      recordStoredLead(Response.json({ ok: true, persisted: true })),
    ).resolves.toBeUndefined();
  });
});
