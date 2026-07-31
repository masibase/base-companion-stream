import { afterEach, describe, expect, it, vi } from "vitest";
import { KickAdapter, TikTokAdapter } from "./index";

function stubFetch(items: Array<{ id: string; user: string; text: string }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => items })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("tiktok adapter", () => {
  it("polls messages and dedupes by id", async () => {
    stubFetch([
      { id: "1", user: "alice", text: "hi" },
      { id: "2", user: "bob", text: "yo" },
    ]);
    const adapter = new TikTokAdapter();
    const received: string[] = [];
    adapter.onMessage((m) => received.push(m.id));
    await adapter.connect({
      baseUrl: "https://proxy.local",
      username: "x",
      pollIntervalMs: 5,
    });

    const batch2 = vi.fn(async () => ({
      ok: true,
      json: async () => [
        { id: "2", user: "bob", text: "yo" },
        { id: "3", user: "carol", text: "sup" },
      ],
    }));
    vi.stubGlobal("fetch", batch2);
    await new Promise((r) => setTimeout(r, 10));

    expect(received).toEqual(["1", "2", "3"]);
    await adapter.disconnect();
  });

  it("rejects without baseUrl (unofficial API, no fake endpoint)", async () => {
    const adapter = new TikTokAdapter();
    await expect(
      adapter.connect({ baseUrl: "", username: "x" }),
    ).rejects.toThrow(/baseUrl required/);
  });
});

describe("kick adapter", () => {
  it("emits messages on the kick platform", async () => {
    stubFetch([{ id: "k1", user: "dave", text: "gg" }]);
    const adapter = new KickAdapter();
    const received: string[] = [];
    adapter.onMessage((m) => {
      received.push(m.platform);
    });
    await adapter.connect({ baseUrl: "https://proxy.local", username: "x" });
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toEqual(["kick"]);
    await adapter.disconnect();
  });
});
