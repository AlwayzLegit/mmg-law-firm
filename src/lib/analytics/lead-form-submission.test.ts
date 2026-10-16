import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  leadFormDefaults,
  type LeadFormValues,
} from "@/lib/validation/lead-form-values";

const mocks = vi.hoisted(() => ({
  handler: undefined as undefined | ((values: LeadFormValues) => Promise<void>),
  reset: vi.fn(),
  setError: vi.fn(),
  state: vi.fn(),
  track: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (value: unknown) => [value, mocks.state],
  useEffect: vi.fn(),
  useRef: (value: unknown) => ({ current: value }),
  useCallback: (fn: unknown) => fn,
  useId: () => "fixture-id",
}));
vi.mock("react-hook-form", async (original) => ({
  ...(await original<typeof import("react-hook-form")>()),
  useForm: () => ({
    formState: { errors: {}, isSubmitting: false },
    control: {},
    register: () => ({}),
    setValue: vi.fn(),
    setError: mocks.setError,
    reset: mocks.reset,
    handleSubmit: (handler: typeof mocks.handler) => {
      mocks.handler = handler;
      return handler;
    },
  }),
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/lib/analytics/track", () => ({ track: mocks.track }));
import { LeadForm } from "@/components/marketing/lead-form";
import { V3LeadForm } from "@/components/v3/v3-lead-form";

const values: LeadFormValues = {
  ...leadFormDefaults,
  full_name: "Private Name",
  phone: "2025550123",
  email: "private@example.test",
  description: "Private narrative",
  consent_contact: true,
  turnstileToken: "unit-only-token",
};

describe.each(["legacy", "v3"])(
  "%s form success handler (mocked transports/hooks)",
  (version) => {
    const gtag = vi.fn();
    const fetchMock = vi.fn();
    beforeEach(() => {
      vi.clearAllMocks();
      mocks.handler = undefined;
      vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TESTONLY");
      vi.stubGlobal("fetch", fetchMock);
      vi.stubGlobal("window", {
        gtag,
        location: { href: "https://example.test/contact?private=yes" },
      });
      vi.stubGlobal("document", { referrer: "" });
      if (version === "legacy") LeadForm({});
      else V3LeadForm({ fields: [], submitLabel: "Submit" });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    async function submit(response: Response) {
      fetchMock.mockResolvedValue(response);
      await mocks.handler!(values);
      await vi.waitFor(() => expect(mocks.reset).toHaveBeenCalledTimes(1));
    }

    it("does not send a conversion on rendering", () => {
      expect(mocks.handler).toBeTypeOf("function");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(gtag).not.toHaveBeenCalled();
    });
    it("sends one sanitized conversion after stored success and preserves PostHog", async () => {
      await submit(Response.json({ ok: true, persisted: true }));
      await vi.waitFor(() => expect(gtag).toHaveBeenCalledTimes(1));
      expect(gtag.mock.calls[0]).toEqual([
        "event",
        "generate_lead",
        {
          send_to: "G-TESTONLY",
          page_location: "https://example.test/contact",
          page_referrer: "",
          page_title: "Consultation request",
        },
      ]);
      expect(mocks.track.mock.calls[0][0]).toBe("lead_submitted");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(values);
    });
    it.each([{ ok: true, persisted: false }, { ok: true }])(
      "keeps existing confirmation without counting stub/old success",
      async (body) => {
        await submit(Response.json(body));
        expect(gtag).not.toHaveBeenCalled();
        expect(mocks.track.mock.calls[0][0]).toBe("lead_submitted");
      },
    );
    it("keeps successful confirmation if analytics throws", async () => {
      gtag.mockImplementationOnce(() => {
        throw new Error("blocked");
      });
      await submit(Response.json({ ok: true, persisted: true }));
      expect(mocks.toast.error).not.toHaveBeenCalled();
    });
    it("does not count malformed success JSON or break confirmation", async () => {
      await submit(new Response("not JSON"));
      expect(gtag).not.toHaveBeenCalled();
    });
    it.each([
      [429, { error: "rate-limited" }],
      [400, { error: "turnstile-failed" }],
      [400, { error: "validation-failed", issues: { full_name: ["Invalid"] } }],
      [500, { error: "db-insert-failed" }],
    ])("does not count HTTP %i rejection", async (status, body) => {
      fetchMock.mockResolvedValue(
        Response.json(body, { status: Number(status) }),
      );
      await mocks.handler!(values);
      expect(gtag).not.toHaveBeenCalled();
      expect(mocks.reset).not.toHaveBeenCalled();
      expect(mocks.track).not.toHaveBeenCalled();
    });
    it.each([new Error("network"), new DOMException("timeout", "AbortError")])(
      "does not count network/timeout failure",
      async (error) => {
        fetchMock.mockRejectedValue(error);
        await mocks.handler!(values);
        expect(gtag).not.toHaveBeenCalled();
        expect(mocks.reset).not.toHaveBeenCalled();
      },
    );
  },
);
