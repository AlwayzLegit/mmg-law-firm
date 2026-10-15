import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getServerSupabase: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateSitemaps: vi.fn(),
  logAudit: vi.fn(),
}));
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: mocks.getServerSupabase,
}));
vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit,
  logAuditMany: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/seo/revalidate-sitemaps", () => ({
  revalidateSitemaps: mocks.revalidateSitemaps,
}));
import { updateLocationPage } from "./actions";

describe("location body saves preserve unrelated fields and review dates", () => {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const from = vi.fn();
  const id = "a1f00f89-8bb5-4dbc-a32c-08243613924a";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin" } });
    mocks.getServerSupabase.mockResolvedValue({ from });
    from.mockReturnValue(chain);
    chain.update.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue({
      data: {
        cities: { slug: "salinas", counties: { slug: "monterey-county" } },
        practice_areas: { slug: "motorcycle-accidents" },
      },
      error: null,
    });
  });

  function form(fields: Record<string, string> = {}) {
    const data = new FormData();
    data.set("id", id);
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  }

  it("writes only the changed local body, never metadata, intro or review date", async () => {
    expect(
      await updateLocationPage(
        form({ local_angle_md: "Corrected factual text" }),
      ),
    ).toEqual({ ok: true });
    expect(chain.update).toHaveBeenCalledExactlyOnceWith({
      local_angle_md: "Corrected factual text",
    });
    expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/locations/monterey-county/salinas/motorcycle-accidents",
    );
    expect(mocks.revalidateSitemaps).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "edit", entity_id: id }),
    );
  });

  it("can clear an explicitly supplied body without clearing omitted fields", async () => {
    await updateLocationPage(form({ intro_md: "  " }));
    expect(chain.update).toHaveBeenCalledExactlyOnceWith({ intro_md: null });
  });

  it("still supports a separately supplied metadata edit in the mocked action", async () => {
    await updateLocationPage(
      form({ meta_description: "An explicitly supplied description" }),
    );
    expect(chain.update).toHaveBeenCalledExactlyOnceWith({
      meta_description: "An explicitly supplied description",
    });
  });

  it("rejects an empty patch and does not mutate a review stamp", async () => {
    expect(await updateLocationPage(form())).toEqual({
      ok: false,
      error: "No changes to save.",
    });
    expect(chain.update).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("retains input validation and authorization", async () => {
    expect(
      (await updateLocationPage(form({ local_angle_md: "x".repeat(20001) })))
        .ok,
    ).toBe(false);
    expect(chain.update).not.toHaveBeenCalled();
    mocks.requireAdmin.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(
      updateLocationPage(form({ intro_md: "Do not write" })),
    ).rejects.toThrow("Unauthorized");
    expect(chain.update).not.toHaveBeenCalled();
  });

  it("keeps unchanged metadata out of the browser form submission", () => {
    const editor = readFileSync(
      "src/app/(admin)/admin/content/location-pages/[id]/edit-form.tsx",
      "utf8",
    );
    expect(editor).toContain(
      'if (meta === props.meta_description) fd.delete("meta_description")',
    );
    expect(editor).toContain("Review date unchanged.");
    expect(editor).not.toContain("last_reviewed_at bumped");
  });
});
