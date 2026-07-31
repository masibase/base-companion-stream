# Agent Companion

**A modular Agent OS for live streamers and content creators.**

Agent Companion is not a single chatbot. It is an orchestrator platform where
specialized AI agents — a co-host, a director, a producer, a moderator, a
researcher, a translator, an analyst, a manager — cooperate through a shared
event bus to support a creator from pre-planning, through the live stream, to
post-production.

## Status

> **Sprint 1 (Foundation)** — in progress. Windows desktop app: Tauri 2 + React + TypeScript.

## Principles

- **No feature without an agent** — every feature is owned by an agent
- **No agent without a workflow** — every agent acts through a declared workflow
- **Provider agnostic** — swap OpenAI, Ollama, or anything else
- **Plugin first** — capabilities ship as replaceable modules
- **Human in control** — the creator approves; agents suggest
- **Privacy by design** — local-first, keys stay on the machine
- **Offline first where possible** — local models for STT/TTS/LLM

## Sprint 1 scope

| Area | Deliverable |
|---|---|
| Desktop app | Tauri 2 + React + TS shell, Configuration Manager, dashboard |
| Provider Manager | OpenAI + Ollama, extensible provider interface |
| Voice Engine | STT, TTS, wake word "Nova" |
| Chat adapters | YouTube, Twitch, TikTok, Kick |
| OBS bridge | OBS WebSocket connect, scene/source control |
| Overlay | status bar, transcript, response preview |
| Logging + Summary | session event log + post-live summary |

## Repository structure

```
agent-companion/
├── apps/        desktop (Tauri), overlay, launcher
├── core/        orchestrator, event-bus, workflow-engine, provider-manager, plugin-manager, permission-manager
├── agents/      nova, director, producer, moderator, researcher, translator, analyst, manager
├── services/    stt, tts, wake-word, chat-adapters, obs, logging, memory, summary
├── plugins/     third-party extensions
├── storage/     local data (session logs, memory)
├── docs/        vision, architecture, workflows, system prompts, API, config, security, testing
├── tests/       integration & hardware checklist
└── scripts/     dev tooling
```

## Getting started

Prerequisites: Node 20+, pnpm 10, Rust toolchain, Windows 10/11 (WebView2).

```bash
pnpm install
pnpm dev
```

## Docs

- [Vision](docs/VISION.md) | [Architecture](docs/ARCHITECTURE.md) | [Roadmap](docs/ROADMAP.md)
- [Workflows](docs/WORKFLOWS.md) | [System prompts](docs/SYSTEM_PROMPTS.md) | [API](docs/API.md)
- [Config](docs/CONFIG.md) | [Security](docs/SECURITY.md) | [Testing](docs/TESTING.md)
- [Project manifesto](docs/PROJECT_MANIFESTO.md)
- [Architecture prompt for coding agents](ARCHITECT_PROMPT.md)

## License

MIT
