import { describe, expect, it } from "vitest";
import { OBSBridge, type OBSClient } from "./index";

function fakeClient(): OBSClient & { calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = [];
  return {
    calls,
    async connect(url: string) {
      calls.push(["connect", url]);
    },
    async disconnect() {},
    async call<T>(name: string, data?: Record<string, unknown>): Promise<T> {
      calls.push([name, data]);
      if (name === "GetSceneList") {
        return { scenes: [{ sceneName: "Live" }, { sceneName: "BRB" }] } as T;
      }
      if (name === "GetSceneItemId") {
        return { sceneItemId: 7 } as T;
      }
      return {} as T;
    },
  };
}

describe("OBSBridge", () => {
  it("connects with ws url and password", async () => {
    const client = fakeClient();
    const bridge = new OBSBridge(() => client);
    await bridge.connect({ host: "localhost", port: 4455, password: "pw" });
    const url = client.calls[0]?.[1];
    expect(url).toContain("ws://localhost:4455");
  });

  it("lists scenes", async () => {
    const bridge = new OBSBridge(() => fakeClient());
    expect(await bridge.listScenes()).toEqual(["Live", "BRB"]);
  });

  it("switches scene", async () => {
    const client = fakeClient();
    const bridge = new OBSBridge(() => client);
    await bridge.switchScene("Live");
    expect(client.calls).toContainEqual([
      "SetCurrentProgramScene",
      { sceneName: "Live" },
    ]);
  });

  it("resolves item id then toggles visibility", async () => {
    const client = fakeClient();
    const bridge = new OBSBridge(() => client);
    await bridge.setSourceVisibility("Live", "Chat", true);
    expect(client.calls).toContainEqual([
      "GetSceneItemId",
      { sceneName: "Live", sourceName: "Chat" },
    ]);
    expect(client.calls).toContainEqual([
      "SetSceneItemEnabled",
      { sceneName: "Live", sceneItemId: 7, sceneItemEnabled: true },
    ]);
  });
});
