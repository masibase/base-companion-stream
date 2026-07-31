import { createAnalystAgent } from "@agent/analyst";
import {
  type ChatAdapter,
  ChatHub,
  KickAdapter,
  TikTokAdapter,
  TwitchAdapter,
  YouTubeAdapter,
} from "@agent/chat-adapters";
import { type AppConfig, ConfigManager, type ConfigStore } from "@agent/config";
import { createEvent, EventBus } from "@agent/event-bus";
import { Logger } from "@agent/logging";
import { createManagerAgent } from "@agent/manager";
import { SessionMemory } from "@agent/memory";
import { createNovaAgent } from "@agent/nova";
import { OBSBridge } from "@agent/obs";
import { Orchestrator } from "@agent/orchestrator";
import { PermissionManager } from "@agent/permission-manager";
import {
  OllamaProvider,
  OpenAIProvider,
  ProviderManager,
} from "@agent/provider-manager";

export interface RuntimeOptions {
  configStore: ConfigStore;
  sessionId?: string;
  apiKeyProvider?: (keyRef: string) => Promise<string | undefined>;
  logger?: Logger;
  /** Override adapters: registered but NOT auto-connected (caller owns lifecycle). */
  adapters?: ChatAdapter[];
  obsBridge?: OBSBridge;
}

export interface Runtime {
  bus: EventBus;
  config: ConfigManager;
  perms: PermissionManager;
  providers: ProviderManager;
  hub: ChatHub;
  obs: OBSBridge;
  memory: SessionMemory;
  orchestrator: Orchestrator;
  logger: Logger;
  stop: () => Promise<void>;
}

export async function createRuntime(opts: RuntimeOptions): Promise<Runtime> {
  const logger = opts.logger ?? new Logger("info");
  const bus = new EventBus();
  const config = new ConfigManager(opts.configStore, bus);
  await config.load();

  const cfg = config.get();
  const perms = new PermissionManager(cfg.permissions);
  const providers = new ProviderManager();

  const openaiKey = await opts.apiKeyProvider?.(cfg.providers.primary.keyRef);
  if (openaiKey) {
    providers.register(
      new OpenAIProvider({
        apiKey: openaiKey,
        defaultModel: cfg.providers.primary.model,
      }),
    );
  }
  providers.register(
    new OllamaProvider({
      baseUrl: cfg.providers.local.baseUrl,
      defaultModel: cfg.providers.local.model,
    }),
  );

  const hub = new ChatHub(bus);
  if (opts.adapters) {
    for (const adapter of opts.adapters) hub.register(adapter);
  } else {
    await registerDefaultAdapters(hub, cfg, opts.apiKeyProvider);
  }

  const obs = opts.obsBridge ?? new OBSBridge();
  if (cfg.obs.enabled) {
    const password = cfg.obs.passwordRef
      ? await opts.apiKeyProvider?.(cfg.obs.passwordRef)
      : undefined;
    void obs
      .connect({ host: cfg.obs.host, port: cfg.obs.port, password })
      .catch((err) =>
        logger.warn("obs.connect.failed", { error: String(err) }),
      );
  }

  const memory = new SessionMemory();
  await memory.start(opts.sessionId ?? "session-default");

  const orchestrator = new Orchestrator(bus);
  orchestrator.register(createManagerAgent({ memory }));
  orchestrator.register(createAnalystAgent({ memory }));
  orchestrator.register(
    createNovaAgent({
      bus,
      providers,
      perms,
      providerId: providers.has(cfg.providers.primary.id)
        ? cfg.providers.primary.id
        : "ollama",
    }),
  );

  await bus.emit(
    createEvent("session.started", "core/runtime", { sessionId: memory.id }),
  );

  return {
    bus,
    config,
    perms,
    providers,
    hub,
    obs,
    memory,
    orchestrator,
    logger,
    async stop() {
      await bus.emit(
        createEvent("session.ended", "core/runtime", { sessionId: memory.id }),
      );
      orchestrator.stop();
      await hub.disconnectAll();
      await obs.disconnect().catch(() => {});
    },
  };
}

async function registerDefaultAdapters(
  hub: ChatHub,
  cfg: AppConfig,
  apiKeyProvider?: RuntimeOptions["apiKeyProvider"],
): Promise<void> {
  const connectCfgs: Record<string, unknown> = {};

  const yt = cfg.chat.youtube;
  if (yt.enabled && yt.videoId) {
    const apiKey = yt.keyRef ? await apiKeyProvider?.(yt.keyRef) : undefined;
    if (apiKey) {
      hub.register(new YouTubeAdapter());
      connectCfgs.youtube = { apiKey, videoId: yt.videoId };
    }
  }

  const tw = cfg.chat.twitch;
  if (tw.enabled && tw.channel) {
    const token = tw.tokenRef ? await apiKeyProvider?.(tw.tokenRef) : undefined;
    hub.register(new TwitchAdapter());
    connectCfgs.twitch = {
      channel: tw.channel,
      username: tw.username || undefined,
      token,
    };
  }

  const tt = cfg.chat.tiktok;
  if (tt.enabled && tt.username && tt.baseUrl) {
    hub.register(new TikTokAdapter());
    connectCfgs.tiktok = { username: tt.username, baseUrl: tt.baseUrl };
  }

  const kk = cfg.chat.kick;
  if (kk.enabled && kk.channel && kk.baseUrl) {
    hub.register(new KickAdapter());
    connectCfgs.kick = { username: kk.channel, baseUrl: kk.baseUrl };
  }

  await hub.connectAll(connectCfgs);
}
