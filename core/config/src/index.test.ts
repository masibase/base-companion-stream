import { EventBus } from "@agent/event-bus";
import { describe, expect, it } from "vitest";
import {
  ConfigError,
  ConfigManager,
  type ConfigStore,
  deepMerge,
  defaultConfig,
  stripSecrets,
  validateConfig,
} from "./index";

function memoryStore(initial?: unknown): ConfigStore & { data: string | null } {
  const store: ConfigStore & { data: string | null } = {
    data: initial === undefined ? null : JSON.stringify(initial),
    async read() {
      return this.data === null ? null : (JSON.parse(this.data) as unknown);
    },
    async write(data: string) {
      this.data = data;
    },
  };
  return store;
}

describe("ConfigManager", () => {
  it("loads defaults when store is empty", async () => {
    const manager = new ConfigManager(memoryStore());
    const config = await manager.load();
    expect(config).toEqual(defaultConfig());
  });

  it("rejects invalid config with a path", async () => {
    const manager = new ConfigManager(
      memoryStore({ version: 1, profile: { name: 42 } }),
    );
    await expect(manager.load()).rejects.toThrow(ConfigError);
    await expect(manager.load()).rejects.toThrow("profile.name");
  });

  it("merges updates and persists", async () => {
    const store = memoryStore();
    const manager = new ConfigManager(store);
    await manager.load();
    await manager.update({ obs: { port: 5555 } });
    expect(manager.get().obs.port).toBe(5555);
    expect(JSON.parse(store.data ?? "{}").obs.port).toBe(5555);
  });

  it("emits config.loaded and config.changed", async () => {
    const bus = new EventBus();
    const types: string[] = [];
    bus.on("config.loaded", (e) => void types.push(e.type));
    bus.on("config.changed", (e) => void types.push(e.type));
    const manager = new ConfigManager(memoryStore(), bus);
    await manager.load();
    await manager.update({ profile: { name: "new" } });
    expect(types).toEqual(["config.loaded", "config.changed"]);
  });
});

describe("export/import", () => {
  it("export strips secret refs", async () => {
    const manager = new ConfigManager(memoryStore());
    await manager.load();
    const exported = manager.exportSanitized();
    expect(exported).not.toContain("keyring:openai");
    expect(exported).not.toContain("keyring:obs");
    expect(exported).toContain("profile");
  });

  it("import merges and keeps local secret refs", async () => {
    const store = memoryStore();
    const manager = new ConfigManager(store);
    await manager.load();
    await manager.importFrom(
      JSON.stringify({
        profile: { name: "imported" },
        providers: { primary: { id: "ollama" } },
      }),
    );
    expect(manager.get().profile.name).toBe("imported");
    expect(manager.get().providers.primary.id).toBe("ollama");
    expect(manager.get().providers.primary.keyRef).toBe("keyring:openai");
    await expect(manager.importFrom("{bad json")).rejects.toThrow();
  });
});

describe("helpers", () => {
  it("deepMerge overrides scalars and merges objects", () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { b: 9 } })).toEqual({
      a: { b: 9, c: 2 },
    });
  });

  it("stripSecrets removes secret keys recursively", () => {
    const stripped = stripSecrets({
      providers: { primary: { id: "openai", keyRef: "keyring:openai" } },
    }) as Record<string, unknown>;
    expect(stripped).toEqual({ providers: { primary: { id: "openai" } } });
  });

  it("validateConfig rejects non-object", () => {
    expect(() => validateConfig(null)).toThrow(ConfigError);
  });
});
