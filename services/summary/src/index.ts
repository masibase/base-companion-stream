import type { MemoryEntry } from "@agent/memory";

export interface ChatRecord {
  user: string;
  text: string;
  ts: string;
}

export interface SessionSummary {
  sessionId: string;
  messageCount: number;
  uniqueUsers: number;
  topUsers: Array<{ user: string; count: number }>;
  highlights: ChatRecord[];
  generatedAt: string;
}

const HIGHLIGHT_CAP = 5;
const TOP_USERS_CAP = 5;

export function buildSummary(
  entries: MemoryEntry[],
  sessionId: string,
): SessionSummary {
  const chats: ChatRecord[] = [];
  for (const entry of entries) {
    if (entry.type !== "chat.message") continue;
    const payload = entry.payload as { user?: string; text?: string };
    if (typeof payload.user !== "string" || typeof payload.text !== "string")
      continue;
    chats.push({ user: payload.user, text: payload.text, ts: entry.ts });
  }

  const counts = new Map<string, number>();
  for (const chat of chats) {
    counts.set(chat.user, (counts.get(chat.user) ?? 0) + 1);
  }
  const topUsers = [...counts.entries()]
    .map(([user, count]) => ({ user, count }))
    .sort((a, b) => b.count - a.count || a.user.localeCompare(b.user))
    .slice(0, TOP_USERS_CAP);

  const highlights = chats
    .filter((chat) => chat.text.includes("!") || chat.text.includes("?"))
    .slice(0, HIGHLIGHT_CAP);

  return {
    sessionId,
    messageCount: chats.length,
    uniqueUsers: counts.size,
    topUsers,
    highlights,
    generatedAt: new Date().toISOString(),
  };
}
