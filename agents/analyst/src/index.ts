import type { SessionMemory } from "@agent/memory";
import type { AgentDefinition } from "@agent/orchestrator";
import { buildSummary, type SessionSummary } from "@agent/summary";

export function createAnalystAgent(opts: {
  memory: SessionMemory;
}): AgentDefinition {
  return {
    id: "analyst",
    listens: ["session.ended"],
    async handle(event, ctx) {
      const sessionId =
        (event.payload as { sessionId?: string }).sessionId ?? opts.memory.id;
      const summary = buildSummary(opts.memory.all(), sessionId);
      await ctx.emit("summary.ready", summary);
    },
  };
}

export type { SessionSummary };
