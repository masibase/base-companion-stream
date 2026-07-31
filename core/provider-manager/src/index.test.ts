import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaProvider, OpenAIProvider, ProviderManager } from "./index";
import type { Provider } from "./types";

const fakeProvider: Provider = {
  id: "fake",
  async chat(messages) {
    return `reply to: ${messages.at(-1)?.content}`;
  },
  async listModels() {
    return ["fake-1"];
  },
  async ping() {
    return true;
  },
};

describe("ProviderManager", () => {
  it("registers, lists, and routes to providers", async () => {
    const manager = new ProviderManager();
    manager.register(fakeProvider);
    expect(manager.list()).toEqual(["fake"]);
    expect(manager.has("fake")).toBe(true);
    const text = await manager
      .get("fake")
      .chat([{ role: "user", content: "hello" }]);
    expect(text).toBe("reply to: hello");
  });

  it("throws on unknown provider", () => {
    const manager = new ProviderManager();
    expect(() => manager.get("nope")).toThrow("provider not registered");
  });
});

describe("OpenAIProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls /chat/completions with bearer auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hi" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OpenAIProvider({ apiKey: "sk-test" });
    expect(await provider.chat([{ role: "user", content: "yo" }])).toBe("hi");
    const call = fetchMock.mock.calls[0];
    const headers = (call?.[1]?.headers ?? {}) as Record<string, string>;
    expect(String(call?.[0])).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
    expect(headers.Authorization).toBe("Bearer sk-test");
  });

  it("ping returns false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await new OpenAIProvider({ apiKey: "x" }).ping()).toBe(false);
  });
});

describe("OllamaProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls local /api/chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "halo" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OllamaProvider();
    expect(
      await provider.chat([{ role: "user", content: "hai" }], {
        model: "llama3.1",
      }),
    ).toBe("halo");
    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toBe("http://localhost:11434/api/chat");
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body.model).toBe("llama3.1");
  });
});
