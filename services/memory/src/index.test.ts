import { describe, expect, it } from "vitest";
import { type MemoryEntry, type MemoryStore, SessionMemory } from "./index";

function memoryStore(
  initial: MemoryEntry[] = [],
): MemoryStore & { data: MemoryEntry[] } {
  const store: MemoryStore & { data: MemoryEntry[] } = {
    data: initial,
    async load() {
      return this.data;
    },
    async save(entries) {
      this.data = entries;
    },
  };
  return store;
}

describe("SessionMemory", () => {
  it("records entries scoped to the session", async () => {
    const memory = new SessionMemory();
    await memory.start("sess-1");
    memory.record("chat.message", "services/chat-adapters/twitch", {
      user: "alice",
      text: "hi",
    });
    memory.record("chat.message", "services/chat-adapters/twitch", {
      user: "bob",
      text: "yo",
    });
    memory.record("obs.changed", "services/obs", { scene: "Live" });
    expect(memory.all()).toHaveLength(3);
    expect(memory.entriesOf("chat.message")).toHaveLength(2);
    expect(memory.all()[0]?.sessionId).toBe("sess-1");
  });

  it("persists and restores the session", async () => {
    const store = memoryStore();
    const memory = new SessionMemory(store);
    await memory.start("sess-1");
    memory.record("chat.message", "test", { text: "hello" });
    await memory.persist();
    expect(store.data).toHaveLength(1);

    const restored = new SessionMemory(store);
    await restored.start("sess-1");
    expect(restored.all()).toHaveLength(1);
    expect(restored.all()[0]?.payload).toEqual({ text: "hello" });
  });

  it("does not load other sessions' entries", async () => {
    const store = memoryStore([
      {
        id: "a",
        ts: "t",
        sessionId: "other",
        type: "chat.message",
        source: "x",
        payload: {},
      },
    ]);
    const memory = new SessionMemory(store);
    await memory.start("sess-1");
    expect(memory.all()).toHaveLength(0);
  });
});
