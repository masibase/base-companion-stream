import { createEvent, EventBus } from "@agent/event-bus";
import { SessionMemory } from "@agent/memory";
import { Orchestrator } from "@agent/orchestrator";
import { describe, expect, it } from "vitest";
import { createManagerAgent } from "./index";

describe("manager agent", () => {
  it("records significant events to memory (W-07)", async () => {
    const bus = new EventBus();
    const memory = new SessionMemory();
    await memory.start("sess-1");
    const orchestrator = new Orchestrator(bus);
    orchestrator.register(createManagerAgent({ memory }));

    await bus.emit(
      createEvent("chat.message", "services/chat-adapters/twitch", {
        user: "alice",
        text: "hi",
      }),
    );
    await bus.emit(
      createEvent("response.ready", "agents/nova", { text: "hello" }),
    );
    await bus.emit(
      createEvent("session.ended", "core/runtime", { sessionId: "sess-1" }),
    );

    const entries = memory.all();
    expect(entries.map((e) => e.type)).toEqual([
      "chat.message",
      "response.ready",
      "session.ended",
    ]);
    expect(entries[0]?.sessionId).toBe("sess-1");
  });

  it("ignores non-significant events", async () => {
    const bus = new EventBus();
    const memory = new SessionMemory();
    await memory.start("sess-1");
    const orchestrator = new Orchestrator(bus);
    orchestrator.register(createManagerAgent({ memory }));

    await bus.emit(createEvent("anything.else", "test", {}));
    expect(memory.all()).toHaveLength(0);
  });
});
