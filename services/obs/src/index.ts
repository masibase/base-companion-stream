import OBSWebSocket from "obs-websocket-js";

export interface OBSConfig {
  host: string;
  port: number;
  password?: string;
}

export interface OBSClient {
  connect(url: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  call<T>(name: string, data?: Record<string, unknown>): Promise<T>;
}

export type OBSClientFactory = () => OBSClient;

export class OBSBridge {
  private client: OBSClient;

  constructor(
    factory: OBSClientFactory = () =>
      new OBSWebSocket() as unknown as OBSClient,
  ) {
    this.client = factory();
  }

  async connect(cfg: OBSConfig): Promise<void> {
    await this.client.connect(`ws://${cfg.host}:${cfg.port}`, cfg.password);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async listScenes(): Promise<string[]> {
    const data = await this.client.call<{
      scenes: Array<{ sceneName: string }>;
    }>("GetSceneList");
    return data.scenes.map((scene) => scene.sceneName);
  }

  async switchScene(name: string): Promise<void> {
    await this.client.call("SetCurrentProgramScene", { sceneName: name });
  }

  async setSourceVisibility(
    scene: string,
    source: string,
    visible: boolean,
  ): Promise<void> {
    const { sceneItemId } = await this.client.call<{ sceneItemId: number }>(
      "GetSceneItemId",
      { sceneName: scene, sourceName: source },
    );
    await this.client.call("SetSceneItemEnabled", {
      sceneName: scene,
      sceneItemId,
      sceneItemEnabled: visible,
    });
  }
}
