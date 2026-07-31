import { createEvent, type EventBus } from "@agent/event-bus";
import type { PermissionMode } from "@agent/permission-manager";

export type ReplyPolicy = "auto" | "approve" | "deny";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppConfig {
  version: 1;
  profile: { name: string; language: string };
  providers: {
    primary: { id: string; model: string; keyRef: string };
    local: { id: string; model: string; baseUrl: string };
  };
  voice: {
    wakeWord: string;
    stt: string;
    tts: string;
    language: string;
    autoListen: boolean;
  };
  chat: {
    youtube: {
      enabled: boolean;
      videoId: string;
      keyRef: string;
      replyPolicy: ReplyPolicy;
    };
    twitch: {
      enabled: boolean;
      channel: string;
      username: string;
      tokenRef: string;
      replyPolicy: ReplyPolicy;
    };
    tiktok: { enabled: boolean; username: string; replyPolicy: ReplyPolicy };
    kick: { enabled: boolean; channel: string; replyPolicy: ReplyPolicy };
  };
  obs: { enabled: boolean; host: string; port: number; passwordRef: string };
  overlay: { enabled: boolean; port: number; theme: string };
  logging: { level: LogLevel; retentionDays: number };
  permissions: Record<string, PermissionMode>;
}

export interface ConfigStore {
  read(): Promise<unknown>;
  write(data: string): Promise<void>;
}

export class ConfigError extends Error {}

export function defaultConfig(): AppConfig {
  return {
    version: 1,
    profile: { name: "my-stream", language: "en" },
    providers: {
      primary: { id: "openai", model: "gpt-4o-mini", keyRef: "keyring:openai" },
      local: {
        id: "ollama",
        model: "llama3.1",
        baseUrl: "http://localhost:11434",
      },
    },
    voice: {
      wakeWord: "nova",
      stt: "whisper-local",
      tts: "edge-tts",
      language: "en-US",
      autoListen: true,
    },
    chat: {
      youtube: {
        enabled: false,
        videoId: "",
        keyRef: "",
        replyPolicy: "approve",
      },
      twitch: {
        enabled: false,
        channel: "",
        username: "",
        tokenRef: "",
        replyPolicy: "auto",
      },
      tiktok: { enabled: false, username: "", replyPolicy: "deny" },
      kick: { enabled: false, channel: "", replyPolicy: "deny" },
    },
    obs: {
      enabled: true,
      host: "localhost",
      port: 4455,
      passwordRef: "keyring:obs",
    },
    overlay: { enabled: true, port: 7935, theme: "dark" },
    logging: { level: "info", retentionDays: 30 },
    permissions: {
      "obs.sceneSwitch": "auto",
      "obs.sourceControl": "ask",
      "chat.reply": "ask",
      "tokens.spend": "ask",
      "session.start": "auto",
      "session.end": "auto",
    },
  };
}

export function validateConfig(value: unknown): AppConfig {
  if (typeof value !== "object" || value === null) {
    throw new ConfigError("invalid config: not an object");
  }
  const cfg = value as Record<string, unknown>;
  if (cfg.version !== 1)
    throw new ConfigError("invalid config: unsupported version");
  needString(cfg, "profile.name");
  needString(cfg, "providers.primary.id");
  needNumber(cfg, "obs.port");
  needString(cfg, "logging.level");
  if (
    typeof cfg.permissions !== "object" ||
    cfg.permissions === null ||
    Array.isArray(cfg.permissions)
  ) {
    throw new ConfigError("invalid config: permissions must be an object");
  }
  return value as AppConfig;
}

function needString(cfg: Record<string, unknown>, path: string): void {
  const value = getPath(cfg, path);
  if (typeof value !== "string")
    throw new ConfigError(`invalid config: ${path} must be a string`);
}

function needNumber(cfg: Record<string, unknown>, path: string): void {
  const value = getPath(cfg, path);
  if (typeof value !== "number")
    throw new ConfigError(`invalid config: ${path} must be a number`);
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (typeof acc !== "object" || acc === null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return patch as T;
  }
  if (typeof patch !== "object" || Array.isArray(patch)) return patch as T;
  const out: Record<string, unknown> = {};
  const baseObj = base as Record<string, unknown>;
  const patchObj = patch as Record<string, unknown>;
  for (const [key, value] of Object.entries(baseObj)) {
    out[key] = deepMerge(value, patchObj[key]);
  }
  for (const [key, value] of Object.entries(patchObj)) {
    if (!(key in out)) out[key] = value;
  }
  return out as T;
}

const SECRET_KEYS = new Set(["keyRef", "passwordRef"]);

export function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = stripSecrets(val);
  }
  return out;
}

export class ConfigManager {
  private config: AppConfig = defaultConfig();

  constructor(
    private store: ConfigStore,
    private bus?: EventBus,
  ) {}

  async load(): Promise<AppConfig> {
    const raw = await this.store.read();
    this.config =
      raw === null || raw === undefined ? defaultConfig() : validateConfig(raw);
    await this.bus?.emit(
      createEvent("config.loaded", "core/config", {
        version: this.config.version,
      }),
    );
    return this.config;
  }

  get(): AppConfig {
    return this.config;
  }

  async update(patch: unknown): Promise<AppConfig> {
    this.config = validateConfig(deepMerge(this.config, patch));
    await this.persist();
    return this.config;
  }

  exportSanitized(): string {
    return JSON.stringify(stripSecrets(this.config), null, 2);
  }

  async importFrom(json: string): Promise<AppConfig> {
    const imported = JSON.parse(json) as unknown;
    this.config = validateConfig(deepMerge(this.config, imported));
    await this.persist();
    return this.config;
  }

  private async persist(): Promise<void> {
    await this.store.write(JSON.stringify(this.config, null, 2));
    await this.bus?.emit(
      createEvent("config.changed", "core/config", {
        version: this.config.version,
      }),
    );
  }
}
