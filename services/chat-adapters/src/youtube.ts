import type { ChatAdapter, ChatMessageEvent } from "./types";

export interface YouTubeConfig {
  apiKey: string;
  videoId: string;
  pollIntervalMs?: number;
  baseUrl?: string;
}

interface LiveChatMessage {
  id: string;
  snippet: {
    publishedAt: string;
    displayMessage: string;
    authorChannelId: { value: string };
    authorDisplayName: string;
  };
}

export class YouTubeAdapter implements ChatAdapter {
  readonly platform = "youtube" as const;
  private cfg: YouTubeConfig | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private liveChatId: string | undefined;
  private nextPageToken: string | undefined;
  private polling = false;
  private handlers = new Set<(msg: ChatMessageEvent) => void>();

  connect(cfg: YouTubeConfig): Promise<void> {
    this.cfg = cfg;
    this.timer = setInterval(
      () => void this.poll().catch(() => {}),
      cfg.pollIntervalMs ?? 5000,
    );
    void this.poll().catch(() => {});
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    this.liveChatId = undefined;
    this.nextPageToken = undefined;
    return Promise.resolve();
  }

  async sendMessage(_text: string): Promise<void> {
    return Promise.resolve();
  }

  onMessage(handler: (msg: ChatMessageEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private async poll(): Promise<void> {
    if (this.polling || !this.cfg) return;
    this.polling = true;
    try {
      if (!this.liveChatId) {
        this.liveChatId = await this.resolveLiveChatId(this.cfg);
        if (!this.liveChatId) return;
        return;
      }
      await this.fetchMessages();
    } catch {
      // ponytail: clear id on failure so a stale/restarted stream re-resolves next tick
      this.liveChatId = undefined;
    } finally {
      this.polling = false;
    }
  }

  private async resolveLiveChatId(
    cfg: YouTubeConfig,
  ): Promise<string | undefined> {
    const videoUrl = new URL(`${this.base}/videos`);
    videoUrl.searchParams.set("part", "liveStreamingDetails");
    videoUrl.searchParams.set("id", cfg.videoId);
    videoUrl.searchParams.set("key", cfg.apiKey);
    const video = (await this.get(videoUrl)) as {
      items: Array<{
        liveStreamingDetails?: { activeLiveChatId?: string };
      }>;
    };
    return video.items[0]?.liveStreamingDetails?.activeLiveChatId;
  }

  private async fetchMessages(): Promise<void> {
    const url = new URL(`${this.base}/liveChat/messages`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("liveChatId", this.liveChatId ?? "");
    if (this.nextPageToken)
      url.searchParams.set("pageToken", this.nextPageToken);
    url.searchParams.set("key", this.cfg?.apiKey ?? "");
    const data = (await this.get(url)) as {
      nextPageToken?: string;
      items?: LiveChatMessage[];
    };
    this.nextPageToken = data.nextPageToken;
    for (const item of data.items ?? []) {
      this.emitMessage({
        platform: "youtube",
        user: item.snippet.authorDisplayName,
        text: item.snippet.displayMessage,
        id: item.id,
        ts: item.snippet.publishedAt,
      });
    }
  }

  private get base(): string {
    return this.cfg?.baseUrl ?? "https://www.googleapis.com/youtube/v3";
  }

  private async get(url: URL): Promise<unknown> {
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`youtube error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private emitMessage(msg: ChatMessageEvent): void {
    for (const handler of this.handlers) handler(msg);
  }
}
