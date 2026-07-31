import type { ConfigStore } from "@agent/config";
import { Logger } from "@agent/logging";
import { createRuntime, type Runtime } from "@agent/runtime";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

export const KEYRING_PREFIX = "keyring:";

const OVERLAY_EVENTS = [
  "chat.message",
  "response.ready",
  "permission.denied",
  "session.started",
  "session.ended",
  "summary.ready",
  "config.changed",
] as const;

class TauriConfigStore implements ConfigStore {
  async read(): Promise<unknown> {
    const raw = await invoke<string>("read_config");
    return raw === "null" ? null : (JSON.parse(raw) as unknown);
  }
  async write(json: string): Promise<void> {
    await invoke("write_config", { json });
  }
}

export async function keyringProvider(
  keyRef: string,
): Promise<string | undefined> {
  if (!keyRef.startsWith(KEYRING_PREFIX)) return undefined;
  const key = keyRef.slice(KEYRING_PREFIX.length);
  return (await invoke<string | null>("keyring_get", { key })) ?? undefined;
}

let runtimePromise: Promise<Runtime> | undefined;

export function getRuntime(): Promise<Runtime> {
  runtimePromise ??= createRuntime({
    configStore: new TauriConfigStore(),
    apiKeyProvider: keyringProvider,
    logger: new Logger("info"),
  }).then((rt) => {
    if (rt.config.get().overlay.enabled) {
      void invoke("overlay_start", {
        port: rt.config.get().overlay.port,
      }).catch((err) =>
        rt.logger.warn("overlay_start.failed", { error: String(err) }),
      );
      for (const type of OVERLAY_EVENTS) {
        rt.bus.on(type, (event) => {
          void emit("overlay.event", {
            type: event.type,
            ts: event.ts,
            payload: event.payload,
          });
        });
      }
    }
    return rt;
  });
  return runtimePromise;
}
