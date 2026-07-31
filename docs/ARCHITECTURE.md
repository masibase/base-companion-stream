# Architecture

## Five layers

| Layer | Contents |
|---|---|
| 1. Shell | Tauri app (`apps/desktop`): windows, tray, hotkeys, capabilities/permissions, Configuration Manager |
| 2. Orchestration | `core/`: event-bus, orchestrator, workflow-engine, permission-manager, plugin-manager, config, runtime |
| 3. Agents | `agents/`: nova, director, producer, moderator, researcher, translator, analyst, manager |
| 4. Integration | `services/`: stt, tts, wake-word, chat-adapters, obs, logging, memory, summary + `core/provider-manager` |
| 5. Presentation | React UI: dashboard, settings, live console + `apps/overlay` (status, transcript, reply preview) |

## Runtime flow — live chat response

```
YouTube/Twitch/Kick/TikTok chat
        │  services/chat-adapters
        ▼
EVENT chat.message ──► event-bus (typed pub/sub)
                          │
                          ▼
                orchestrator ──► workflow-engine (W-01 live chat response)
                          │
                          ▼
                  nova (agent) ──► [researcher? translator? moderator?]
                          │
                          ▼
              response.ready ──► tts ──► overlay + chat adapter (reply)
                          │
                          ▼
              logging ──► memory (session)
```

## Runtime flow — voice command

```
mic ─► wake-word ("nova") ─► STT ─► voice.command ─► orchestrator ─► workflow W-02 ─► agents ─► TTS ─► speakers + overlay
```

## Runtime flow — post-live summary

```
session.ended ─► logging (collect session events) ─► analyst (highlights, stats, themes) ─► summary.ready ─► storage + dashboard
```

## Overlay transport

```
desktop (webview) ── bus events (chat.message, response.ready, ...) ── emit("overlay.event")
        ─► Rust std HTTP/SSE server (127.0.0.1:7935) ── GET /events (SSE)
        ─► apps/overlay/index.html (single-file page, OBS browser source)
GET /health ─► {"ok":true} (dashboard reachability check)
```

- Server: dependency-free std Rust (`apps/desktop/src-tauri/src/server.rs`), serves the single-file overlay + `/health` + SSE `/events`.
- Started/stopped from the webview (`overlay_start` / `overlay_stop`), driven by `config.overlay`.

## Communication rules

- All cross-module communication is typed events: `{ id, type, ts, source, payload }`
- Agents listen, decide, and emit; they never import services directly
- Workflows are declared, versioned, and reviewed in `docs/WORKFLOWS.md`
- Each agent has: prompt (`docs/SYSTEM_PROMPTS.md`), workflow, tests

## Tech choices

| Concern | Choice | Why |
|---|---|---|
| Shell | Tauri 2 (Rust backend, WebView2) | small binary, native access, Windows-first |
| Frontend | React + TypeScript, pnpm workspaces | typed, familiar, monorepo-friendly |
| OBS | obs-websocket-js v5 (protocol 5) | standard OBS 30+ remote control |
| STT | Whisper-based local model (faster-whisper / whisper.cpp) | offline-first |
| TTS | edge-tts (free MS voices) or Piper/Kokoro local | free + local options |
| Wake word | OpenWakeWord (local) or Porcupine | permissive licensing |
| Secrets | OS keyring (Tauri plugin / `keyring` crate) | keys never in config or logs |
| Session store | SQLite | embedded, local-first |
