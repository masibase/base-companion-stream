import type { ConfigStore } from "@agent/config";
import { Logger } from "@agent/logging";
import { createRuntime, type Runtime } from "@agent/runtime";
import { invoke } from "@tauri-apps/api/core";

export const KEYRING_PREFIX = "keyring:";

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
  });
  return runtimePromise;
}
