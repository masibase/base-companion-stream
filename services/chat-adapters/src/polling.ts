import type { ChatAdapter, ChatMessageEvent } from "./types";

export interface PollingConfig {
  baseUrl: string;
  pollIntervalMs?: number;
  username: string;
}

// ponytail: generic poller for unofficial APIs (TikTok/Kick have no public
// chat API). Point baseUrl at a bridge/proxy; upgrade when a real endpoint exists.
export abstract class PollingChatAdapter implements ChatAdapter {
  abstract readonly platform: "tiktok" | "kick";
  private timer: ReturnType<typeof setInterval> | undefined;
  private polling = false;
  private seen = new Set<string>();
  private handlers = new Set<(msg: ChatMessageEvent) => void>();

  connect(cfg: PollingConfig): Promise<void> {
    if (!cfg.baseUrl) {
      return Promise.reject(
        new Error(
          `${this.platform}: baseUrl required (unofficial API, point at a chat proxy)`,
        ),
      );
    }
    this.timer = setInterval(
      () => void this.poll(cfg).catch(() => {}),
      cfg.pollIntervalMs ?? 5000,
    );
    void this.poll(cfg).catch(() => {});
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    return Promise.resolve();
  }

  async sendMessage(_text: string): Promise<void> {
    // ponytail: replying needs the platform's session cookie — not implemented
  }

  onMessage(handler: (msg: ChatMessageEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  protected emit(msg: ChatMessageEvent): void {
    for (const handler of this.handlers) handler(msg);
  }

  private async poll(cfg: PollingConfig): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const res = await fetch(`${cfg.baseUrl}/messages`);
      if (!res.ok) return;
      const items = (await res.json()) as Array<{
        id: string;
        user: string;
        text: string;
      }>;
      for (const item of items) {
        if (!item?.id || this.seen.has(item.id)) continue;
        this.seen.add(item.id);
        this.emit({
          platform: this.platform,
          user: item.user,
          text: item.text,
          id: item.id,
          ts: new Date().toISOString(),
        });
      }
    } finally {
      this.polling = false;
    }
  }
}
