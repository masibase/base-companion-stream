import type { ChatAdapter, ChatMessageEvent } from "./types";

export interface TwitchConfig {
  channel: string;
  username?: string;
  token?: string;
}

export interface TwitchSocket {
  send(data: string): void;
  close(): void;
  onmessage: ((ev: { data: string }) => void) | null;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export type SocketFactory = (url: string) => TwitchSocket;

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
const PRIVMSG_RE = /^(?:@([^ ]+) )?:([^!]+)![^ ]+ PRIVMSG #([^ ]+) :(.*)$/;

export class TwitchAdapter implements ChatAdapter {
  readonly platform = "twitch" as const;
  private socket: TwitchSocket | undefined;
  private cfg: TwitchConfig | undefined;
  private handlers = new Set<(msg: ChatMessageEvent) => void>();

  constructor(
    private createSocket: SocketFactory = (url) =>
      new WebSocket(url) as unknown as TwitchSocket,
  ) {}

  connect(cfg: TwitchConfig): Promise<void> {
    this.cfg = cfg;
    return new Promise((resolve, reject) => {
      const socket = this.createSocket(IRC_URL);
      this.socket = socket;
      socket.onopen = () => {
        socket.send(
          cfg.username ? `NICK ${cfg.username}` : "NICK justinfan12345",
        );
        if (cfg.token) socket.send(`PASS oauth:${cfg.token}`);
        socket.send("CAP REQ :twitch.tv/tags");
        socket.send(`JOIN #${cfg.channel.toLowerCase()}`);
        resolve();
      };
      socket.onerror = () => reject(new Error("twitch socket error"));
      socket.onmessage = (event) => this.handleMessage(event.data);
    });
  }

  disconnect(): Promise<void> {
    this.socket?.close();
    this.socket = undefined;
    return Promise.resolve();
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.cfg?.username || !this.cfg.token) return;
    this.socket?.send(`PRIVMSG #${this.cfg.channel.toLowerCase()} :${text}`);
  }

  onMessage(handler: (msg: ChatMessageEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private handleMessage(raw: string): void {
    for (const line of raw.split("\r\n").filter((l) => l.length > 0)) {
      if (line.startsWith("PING")) {
        this.socket?.send("PONG :tmi.twitch.tv");
        continue;
      }
      const match = line.match(PRIVMSG_RE);
      if (!match) continue;
      const tags = parseTags(match[1]);
      this.emitMessage({
        platform: "twitch",
        user: tags["display-name"] || (match[2] ?? ""),
        text: match[4] ?? "",
        id: tags.id ?? `${Date.now()}-${match[2] ?? "anon"}`,
        ts: tags["tmi-sent-ts"]
          ? new Date(Number(tags["tmi-sent-ts"])).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  private emitMessage(msg: ChatMessageEvent): void {
    for (const handler of this.handlers) handler(msg);
  }
}

function parseTags(raw: string | undefined): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!raw) return tags;
  for (const pair of raw.split(";")) {
    const [key, value] = pair.split("=");
    tags[key ?? ""] = value ?? "";
  }
  return tags;
}
