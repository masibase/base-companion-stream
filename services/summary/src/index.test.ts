import type { MemoryEntry } from "@agent/memory";
import { describe, expect, it } from "vitest";
import { buildSummary } from "./index";

function chat(user: string, text: string, ts: string): MemoryEntry {
  return {
    id: `${ts}-${user}`,
    ts,
    sessionId: "sess-1",
    type: "chat.message",
    source: "services/chat-adapters/twitch",
    payload: { user, text },
  };
}

describe("buildSummary", () => {
  it("counts messages, users, top users, and highlights", () => {
    const entries = [
      chat("alice", "hello!", "t1"),
      chat("alice", "this is hype", "t2"),
      chat("alice", "wow", "t3"),
      chat("bob", "hi", "t4"),
      chat("bob", "when is the giveaway?", "t5"),
    ];
    const summary = buildSummary(entries, "sess-1");
    expect(summary.sessionId).toBe("sess-1");
    expect(summary.messageCount).toBe(5);
    expect(summary.uniqueUsers).toBe(2);
    expect(summary.topUsers).toEqual([
      { user: "alice", count: 3 },
      { user: "bob", count: 2 },
    ]);
    expect(summary.highlights).toHaveLength(2);
    expect(summary.highlights[0]?.text).toBe("hello!");
    expect(summary.highlights[1]?.text).toBe("when is the giveaway?");
  });

  it("ignores non-chat entries and caps highlights", () => {
    const entries = [
      { ...chat("alice", "a!", "t1"), type: "obs.changed" },
      ...Array.from({ length: 7 }, (_, i) =>
        chat(`u${i}`, "nice!", `t${i + 2}`),
      ),
    ];
    const summary = buildSummary(entries, "sess-1");
    expect(summary.messageCount).toBe(7);
    expect(summary.highlights).toHaveLength(5);
    expect(summary.uniqueUsers).toBe(7);
  });

  it("returns zeros for empty sessions", () => {
    const summary = buildSummary([], "sess-empty");
    expect(summary.messageCount).toBe(0);
    expect(summary.uniqueUsers).toBe(0);
    expect(summary.topUsers).toEqual([]);
    expect(summary.highlights).toEqual([]);
  });
});
