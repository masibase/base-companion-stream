import { type AgentEvent, createEvent, type EventBus } from "@agent/event-bus";
import type { Logger, LogLevel } from "@agent/logging";

export interface AgentContext {
  emit(type: string, payload: unknown): Promise<void>;
  log(level: LogLevel, msg: string, meta?: unknown): void;
}

export interface AgentDefinition {
  id: string;
  listens: string[];
  handle(event: AgentEvent, ctx: AgentContext): Promise<void> | void;
}

export class Orchestrator {
  private offs: (() => void)[] = [];
  private logFn: (level: LogLevel, msg: string, meta?: unknown) => void;

  constructor(
    private bus: EventBus,
    logger?: Logger,
  ) {
    this.logFn = logger
      ? (level, msg, meta) => logger.log(level, msg, meta)
      : () => {};
  }

  register(agent: AgentDefinition): void {
    for (const type of agent.listens) {
      this.offs.push(this.bus.on(type, (event) => this.dispatch(agent, event)));
    }
  }

  stop(): void {
    for (const off of this.offs) off();
    this.offs = [];
  }

  private async dispatch(
    agent: AgentDefinition,
    event: AgentEvent,
  ): Promise<void> {
    const ctx: AgentContext = {
      emit: (type, payload) =>
        this.bus.emit(createEvent(type, agent.id, payload)),
      log: (level, msg, meta) => this.logFn(level, msg, meta),
    };
    try {
      await agent.handle(event, ctx);
    } catch (err) {
      this.logFn("error", `agent ${agent.id} failed`, { error: String(err) });
      await this.bus.emit(
        createEvent("agent.health", "orchestrator", {
          agent: agent.id,
          error: String(err),
        }),
      );
    }
  }
}
