export type Platform = "youtube" | "twitch" | "tiktok" | "kick";

export interface ChatMessageEvent {
  platform: Platform;
  user: string;
  text: string;
  id: string;
  ts: string;
  meta?: Record<string, unknown>;
}

export interface ChatAdapter {
  readonly platform: Platform;
  connect(cfg: unknown): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(text: string): Promise<void>;
  onMessage(handler: (msg: ChatMessageEvent) => void): () => void;
}
