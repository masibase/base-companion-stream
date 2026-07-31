import { createEvent, EventBus } from "@agent/event-bus";
import { SessionMemory } from "@agent/memory";
import { Orchestrator } from "@agent/orchestrator";
import { describe, expect, it } from "vitest";
import { createAnalystAgent } from "./index";

describe("analyst agent", () => {
  it("emits summary.ready on session.ended (W-06)", async () => {
    const bus = new EventBus();
    const memory = new SessionMemory();
    await memory.start("sess-1");
    memory.record("chat.message", "services/chat-adapters/twitch", {
      user: "alice",
      text: "hype!",
    });
    memory.record("chat.message", "services/chat-adapters/twitch", {
      user: "bob",
      text: "hi",
    });
    const orchestrator = new Orchestrator(bus);
    orchestrator.register(createAnalystAgent({ memory }));

    const summaries: Array<{ messageCount: number; sessionId: string }> = [];
    bus.on(
      "summary.ready",
      (e) =>
        void summaries.push(
          e.payload as { messageCount: number; sessionId: string },
        ),
    );

    await bus.emit(
      createEvent("session.ended", "core/runtime", { sessionId: "sess-1" }),
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.sessionId).toBe("sess-1");
    expect(summaries[0]?.messageCount).toBe(2);
  });
});
