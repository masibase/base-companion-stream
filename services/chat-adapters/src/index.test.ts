import { EventBus } from "@agent/event-bus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatHub } from "./hub";
import { TwitchAdapter, type TwitchSocket } from "./twitch";
import type { ChatAdapter, ChatMessageEvent } from "./types";
import { YouTubeAdapter } from "./youtube";

function fakeSocket(): TwitchSocket & {
  sent: string[];
  trigger(type: "open" | "message" | "error", data?: string): void;
} {
  const sent: string[] = [];
  return {
    sent,
    send(data) {
      sent.push(data);
    },
    close() {},
    onmessage: null,
    onopen: null,
    onclose: null,
    onerror: null,
    trigger(type, data) {
      if (type === "open") this.onopen?.();
      if (type === "message") this.onmessage?.({ data: data ?? "" });
      if (type === "error") this.onerror?.();
    },
  };
}

describe("TwitchAdapter", () => {
  it("joins channel and emits chat messages", async () => {
    const socket = fakeSocket();
    const adapter = new TwitchAdapter(() => socket);
    const received: ChatMessageEvent[] = [];
    adapter.onMessage((msg) => void received.push(msg));
    const connecting = adapter.connect({
      channel: "MyChannel",
      username: "bot",
      token: "abc",
    });
    socket.trigger("open");
    await connecting;
    expect(socket.sent).toContain("NICK bot");
    expect(socket.sent).toContain("PASS oauth:abc");
    expect(socket.sent).toContain("JOIN #mychannel");

    socket.trigger(
      "message",
      "@display-name=Alice;id=msg-1;tmi-sent-ts=1710000000000;user-id=42; :alice!alice@alice.tmi.twitch.tv PRIVMSG #mychannel :hello world",
    );
    expect(received).toEqual([
      {
        platform: "twitch",
        user: "Alice",
        text: "hello world",
        id: "msg-1",
        ts: "2024-03-09T16:00:00.000Z",
      },
    ]);
  });

  it("answers PING with PONG", async () => {
    const socket = fakeSocket();
    const adapter = new TwitchAdapter(() => socket);
    const connecting = adapter.connect({ channel: "c" });
    socket.trigger("open");
    await connecting;
    socket.trigger("message", "PING :tmi.twitch.tv");
    expect(socket.sent.at(-1)).toBe("PONG :tmi.twitch.tv");
  });

  it("sends PRIVMSG only with bot credentials", async () => {
    const socket = fakeSocket();
    const adapter = new TwitchAdapter(() => socket);
    const connecting = adapter.connect({ channel: "c" });
    socket.trigger("open");
    await connecting;
    await adapter.sendMessage("hi");
    expect(socket.sent).not.toContain("PRIVMSG #c :hi");
    await adapter.disconnect();
    const authed = new TwitchAdapter(() => socket);
    const connecting2 = authed.connect({
      channel: "c",
      username: "bot",
      token: "tok",
    });
    socket.trigger("open");
    await connecting2;
    await authed.sendMessage("hi");
    expect(socket.sent).toContain("PRIVMSG #c :hi");
  });
});

describe("YouTubeAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("resolves live chat id then polls messages", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ liveStreamingDetails: { activeLiveChatId: "chat-1" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          nextPageToken: "t2",
          items: [
            {
              id: "m1",
              snippet: {
                publishedAt: "2024-03-09T20:00:00.000Z",
                displayMessage: "hello stream",
                authorChannelId: { value: "u1" },
                authorDisplayName: "bob",
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new YouTubeAdapter();
    const received: ChatMessageEvent[] = [];
    adapter.onMessage((msg) => void received.push(msg));
    await adapter.connect({
      apiKey: "key",
      videoId: "VID",
      pollIntervalMs: 100,
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=VID&key=key",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet&liveChatId=chat-1",
    );
    expect(received).toEqual([
      {
        platform: "youtube",
        user: "bob",
        text: "hello stream",
        id: "m1",
        ts: "2024-03-09T20:00:00.000Z",
      },
    ]);

    await adapter.disconnect();
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock.mock.calls).toHaveLength(2);
  });
});

describe("ChatHub", () => {
  it("normalizes adapter messages to chat.message events", async () => {
    const bus = new EventBus();
    const hub = new ChatHub(bus);
    const seen: ChatMessageEvent[] = [];
    bus.on(
      "chat.message",
      (e) => void seen.push(e.payload as ChatMessageEvent),
    );

    let emit: (msg: ChatMessageEvent) => void = () => {};
    const fake: ChatAdapter = {
      platform: "twitch",
      connect: async () => {},
      disconnect: async () => {},
      sendMessage: async () => {},
      onMessage(handler) {
        emit = handler;
        return () => {};
      },
    };
    hub.register(fake);
    await hub.connectAll({ twitch: { channel: "c" } });
    emit({
      platform: "twitch",
      user: "alice",
      text: "yo",
      id: "1",
      ts: "t",
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.text).toBe("yo");
    expect(bus.listenerCount("chat.message")).toBeGreaterThan(0);
  });
});
