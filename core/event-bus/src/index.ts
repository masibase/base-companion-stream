export interface AgentEvent {
  id: string;
  type: string;
  ts: string;
  source: string;
  payload: unknown;
}

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

let seq = 0;

export function createEvent(
  type: string,
  source: string,
  payload: unknown,
): AgentEvent {
  return {
    id: `evt-${Date.now()}-${seq++}`,
    type,
    ts: new Date().toISOString(),
    source,
    payload,
  };
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)?.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  once(type: string, handler: EventHandler): () => void {
    const off = this.on(type, async (event) => {
      off();
      await handler(event);
    });
    return off;
  }

  async emit(event: AgentEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    for (const handler of [...handlers]) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[event-bus] handler failed for ${event.type}:`, err);
      }
    }
  }

  listenerCount(type: string): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}
