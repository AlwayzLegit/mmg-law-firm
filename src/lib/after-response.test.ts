import { afterEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after: afterMock }));

import { runAfterResponse } from "./after-response";

afterEach(() => {
  afterMock.mockReset();
  vi.restoreAllMocks();
});

describe("runAfterResponse", () => {
  it("hands the task to after() inside a request, so the platform keeps it alive", async () => {
    const task = vi.fn(async () => "done");
    runAfterResponse("t", task);
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();
    await afterMock.mock.calls[0][0]();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("runs the task immediately when there is no request scope", async () => {
    afterMock.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });
    const task = vi.fn(async () => undefined);
    runAfterResponse("t", task);
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("logs a failing task instead of throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    runAfterResponse("boom", async () => {
      throw new Error("resend down");
    });
    await afterMock.mock.calls[0][0]();
    expect(warn).toHaveBeenCalledWith("[after:boom]", "resend down");
  });
});
