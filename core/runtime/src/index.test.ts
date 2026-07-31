import type { ChatAdapter, ChatMessageEvent } from "@agent/chat-adapters";
import { type ConfigStore, defaultConfig } from "@agent/config";
import { Logger } from "@agent/logging";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime } from "./index";

class FakeTwitchAdapter implements ChatAdapter {
  readonly platform = "twitch";
  private handlers = new Set<(msg: ChatMessageEvent) => void>();
  onMessage(handler: (msg: ChatMessageEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  connect(): Promise<void> {
    return Promise.resolve();
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  sendMessage(): Promise<void> {
    return Promise.resolve();
  }
  emit(msg: ChatMessageEvent): void {
    for (const handler of this.handlers) handler(msg);
  }
}

class MemoryStore implements ConfigStore {
  private value: unknown;
  constructor(value?: unknown) {
    this.value = value ?? null;
  }
  read(): Promise<unknown> {
    return Promise.resolve(this.value);
  }
  write(json: string): Promise<void> {
    this.value = JSON.parse(json) as unknown;
    return Promise.resolve();
  }
}

const quietLogger = new Logger("error", () => {});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runtime bootstrap", () => {
  it("boots config -> providers -> hub -> orchestrator -> nova -> memory (end-to-end)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          url.includes("/chat/completions")
            ? { choices: [{ message: { content: "hai alice!" } }] }
            : { data: [] },
      })),
    );

    const cfg = defaultConfig();
    cfg.obs.enabled = false;
    cfg.permissions["chat.reply"] = "auto";
    cfg.chat.twitch.enabled = true;
    cfg.chat.twitch.channel = "mychannel";
    const store = new MemoryStore(structuredClone(cfg));
    const twitch = new FakeTwitchAdapter();
    const runtime = await createRuntime({
      configStore: store,
      sessionId: "sess-1",
      apiKeyProvider: async () => "sk-test",
      adapters: [twitch],
      obsBridge: {
        connect: async () => {},
        disconnect: async () => {},
      } as never,
      logger: quietLogger,
    });

    const responses: Array<{ text: string }> = [];
    const summaries: Array<{ messageCount: number; sessionId: string }> = [];
    runtime.bus.on(
      "response.ready",
      (e) => void responses.push(e.payload as { text: string }),
    );
    runtime.bus.on(
      "summary.ready",
      (e) =>
        void summaries.push(
          e.payload as { messageCount: number; sessionId: string },
        ),
    );

    twitch.emit({
      id: "m1",
      ts: new Date().toISOString(),
      user: "alice",
      text: "halo!",
      platform: "twitch",
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await runtime.stop();

    expect(responses).toHaveLength(1);
    expect(responses[0]?.text).toBe("hai alice!");
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.sessionId).toBe("sess-1");
    expect(summaries[0]?.messageCount).toBeGreaterThanOrEqual(1);
    expect(runtime.providers.has("openai")).toBe(true);
    expect(runtime.providers.has("ollama")).toBe(true);
    expect(runtime.memory.all().map((e) => e.type)).toContain("chat.message");
  });

  it("falls back to ollama when no API key (provider agnostic)", async () => {
    const cfg = defaultConfig();
    cfg.obs.enabled = false;
    const store = new MemoryStore(structuredClone(cfg));
    const runtime = await createRuntime({
      configStore: store,
      sessionId: "sess-2",
      apiKeyProvider: async () => undefined,
      adapters: [],
      logger: quietLogger,
    });

    expect(runtime.providers.has("openai")).toBe(false);
    expect(runtime.providers.has("ollama")).toBe(true);
    await runtime.stop();
  });
});
