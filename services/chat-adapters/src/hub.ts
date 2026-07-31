import { createEvent, type EventBus } from "@agent/event-bus";
import type { ChatAdapter } from "./types";

export class ChatHub {
  private adapters = new Map<string, ChatAdapter>();
  private offs: (() => void)[] = [];

  constructor(private bus: EventBus) {}

  register(adapter: ChatAdapter): void {
    this.adapters.set(adapter.platform, adapter);
    this.offs.push(
      adapter.onMessage((msg) => {
        void this.bus.emit(
          createEvent(
            "chat.message",
            `services/chat-adapters/${adapter.platform}`,
            msg,
          ),
        );
      }),
    );
  }

  get(platform: string): ChatAdapter | undefined {
    return this.adapters.get(platform);
  }

  async connectAll(cfgs: Record<string, unknown>): Promise<void> {
    for (const [platform, cfg] of Object.entries(cfgs)) {
      await this.adapters.get(platform)?.connect(cfg);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.disconnect();
    }
  }
}
