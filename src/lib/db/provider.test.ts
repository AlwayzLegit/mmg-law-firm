import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataProvider, withDataProvider } from "@/lib/db/provider";

// No Cloudflare context in a unit test: the D1 path asks for one and must fail loudly.
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: {} }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function fakeSupabase() {
  const from = vi.fn(() => "supabase-from");
  const rpc = vi.fn(() => "supabase-rpc");
  const client = { from, rpc, auth: { getUser: () => "user" }, storage: "bucket" };
  return { client: client as unknown as SupabaseClient, from, rpc };
}

describe("DATA_PROVIDER", () => {
  it("is supabase unless the value is exactly d1", () => {
    expect(dataProvider()).toBe("supabase");
    for (const v of ["", "D1", "d1 ", "true", "1", "supabase"]) {
      vi.stubEnv("DATA_PROVIDER", v);
      expect(dataProvider()).toBe("supabase");
    }
    vi.stubEnv("DATA_PROVIDER", "d1");
    expect(dataProvider()).toBe("d1");
  });

  it("by default hands back the Supabase client itself, untouched", () => {
    const { client, from } = fakeSupabase();
    const got = withDataProvider(() => client);
    expect(got).toBe(client);
    expect(from).not.toHaveBeenCalled();
  });

  it("with d1 sends from() and rpc() to D1 and everything else to Supabase, built lazily", async () => {
    vi.stubEnv("DATA_PROVIDER", "d1");
    const { client, from, rpc } = fakeSupabase();
    const build = vi.fn(() => client);
    const got = withDataProvider(build);
    // Querying never builds the Supabase client (so it needs no Supabase key).
    const res = await got.from("counties").select("id");
    expect(build).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    // No D1 binding in this test: the failure is in the result, never a throw.
    expect(res.data).toBeNull();
    expect(res.error?.message).toContain("needs the D1 binding DB");
    const fn = await got.rpc("bump_rate_limit", {});
    expect(fn.error?.code).toBe("PGRST202"); // no function moved yet
    expect(rpc).not.toHaveBeenCalled();
    // auth and storage still come from Supabase.
    expect((got.auth as unknown as { getUser(): string }).getUser()).toBe("user");
    expect((got as unknown as { storage: string }).storage).toBe("bucket");
    expect(build).toHaveBeenCalledTimes(1);
  });
});
