export interface MemoryEntry {
  id: string;
  ts: string;
  sessionId: string;
  type: string;
  source: string;
  payload: unknown;
}

export interface MemoryStore {
  load(): Promise<MemoryEntry[]>;
  save(entries: MemoryEntry[]): Promise<void>;
}

const noopStore: MemoryStore = {
  load: async () => [],
  save: async () => {},
};

let seq = 0;

export class SessionMemory {
  private entries: MemoryEntry[] = [];
  private sessionId = "";

  constructor(private store: MemoryStore = noopStore) {}

  async start(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    const stored = await this.store.load();
    this.entries = stored.filter((entry) => entry.sessionId === sessionId);
  }

  get id(): string {
    return this.sessionId;
  }

  record(type: string, source: string, payload: unknown): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${seq++}`,
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      type,
      source,
      payload,
    };
    this.entries.push(entry);
    return entry;
  }

  all(): MemoryEntry[] {
    return this.entries;
  }

  entriesOf(type: string): MemoryEntry[] {
    return this.entries.filter((entry) => entry.type === type);
  }

  async persist(): Promise<void> {
    await this.store.save(this.entries);
  }
}
