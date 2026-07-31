import type { SessionMemory } from "@agent/memory";
import type { AgentDefinition } from "@agent/orchestrator";

export const SIGNIFICANT_EVENTS = [
  "chat.message",
  "response.ready",
  "permission.denied",
  "obs.changed",
  "session.started",
  "session.ended",
  "summary.ready",
] as const;

export function createManagerAgent(opts: {
  memory: SessionMemory;
}): AgentDefinition {
  return {
    id: "manager",
    listens: [...SIGNIFICANT_EVENTS],
    handle(event, ctx) {
      opts.memory.record(event.type, event.source, event.payload);
      ctx.log("debug", "memory.recorded", { type: event.type });
    },
  };
}
