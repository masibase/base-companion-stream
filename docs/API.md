# API

## Event envelope

All cross-module communication is typed events on the event bus.

```ts
interface AgentEvent {
  id: string;          // uuid
  type: string;        // "chat.message", "response.ready", ...
  ts: string;          // ISO 8601
  source: string;      // "services/chat-adapters/youtube" | "agents/nova" | ...
  payload: unknown;
}
```

## Event bus — `core/event-bus`

```ts
interface EventBus {
  emit(event: AgentEvent): Promise<void>;
  on(type: string, handler: (e: AgentEvent) => void): () => void; // returns unsubscribe
  once(type: string, handler: (e: AgentEvent) => void): void;
}
```

## Provider interface — `core/provider-manager`

```ts
interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }

interface Provider {
  readonly id: string;                    // "openai" | "ollama" | ...
  chat(messages: ChatMessage[], opts?: { model?: string; temperature?: number }): Promise<string>;
  listModels(): Promise<string[]>;
  ping(): Promise<boolean>;
}
```

OpenAI and Ollama implement this interface. Adding Anthropic, Gemini, or a
local llama.cpp endpoint = one new file, no core changes.

## Chat adapter interface — `services/chat-adapters`

```ts
interface ChatAdapter {
  readonly platform: "youtube" | "twitch" | "tiktok" | "kick";
  connect(cfg: unknown): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(text: string): Promise<void>;   // no-op where platform forbids replies
  onMessage(handler: (msg: ChatMessageEvent) => void): () => void;
}

interface ChatMessageEvent {
  platform: string;
  user: string;
  text: string;
  id: string;
  ts: string;
  meta?: Record<string, unknown>;  // badges, emotes, superchat, ...
}
```

Note: TikTok and Kick connectors are reverse-engineered (unofficial) and may
break without notice — isolate all platform specifics inside the adapter.

## Voice interfaces — `services/`

```ts
interface STT { transcribe(audio: Blob | Buffer): Promise<string>; }
interface TTS { speak(text: string): Promise<void>; stop(): void; }
interface WakeWord { start(onWake: () => void): Promise<void>; stop(): void; }
```

## OBS bridge — `services/obs`

Wrapper around obs-websocket-js (protocol 5).

```ts
interface OBSBridge {
  connect(opts: { host: string; port: number; password: string }): Promise<void>;
  disconnect(): Promise<void>;
  listScenes(): Promise<string[]>;
  switchScene(name: string): Promise<void>;
  setSourceVisibility(scene: string, source: string, visible: boolean): Promise<void>;
  onEvent(type: string, handler: (data: unknown) => void): void;
}
```

All mutating calls must pass `core/permission-manager` first.

## Key event types

| Type | Meaning | Source |
|---|---|---|
| `chat.message` | new chat message | chat-adapters |
| `chat.reply` | outbound chat reply | agents/nova |
| `voice.wakeword` | wake word detected | wake-word |
| `voice.transcript` | STT result | stt |
| `response.ready` | agent response ready | agents |
| `command.obs` | OBS command request | chat / creator |
| `obs.connected` / `obs.changed` | OBS state | services/obs |
| `session.started` / `session.ended` | live session lifecycle | manager |
| `summary.ready` | post-live summary | analyst |
| `memory.saved` | memory write | memory |
| `workflow.started` / `workflow.completed` | workflow lifecycle | manager |
| `agent.health` | agent failure/status | manager |
| `permission.denied` | guard refused an action | permission-manager |
