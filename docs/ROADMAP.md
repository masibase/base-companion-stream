# Roadmap

## Sprint 1 — Foundation (current)

- Desktop app: Tauri 2 + React + TS shell, Configuration Manager
- Provider Manager: OpenAI + Ollama (+ interface for more)
- Voice Engine: STT, TTS, wake word "Nova"
- Chat adapters: YouTube, Twitch first; TikTok, Kick behind the same interface
- OBS bridge: WebSocket connect, scene switch, source visibility
- Overlay: status, transcript, response preview
- Logging + post-live summary

**Acceptance**
- [ ] App boots; config loads, saves, exports, imports
- [ ] Login to OpenAI + Ollama; chat round-trip works
- [ ] Wake word "Nova" → STT → response → TTS → overlay
- [ ] YouTube + Twitch chat read; reply where the platform allows
- [ ] OBS connect; scene switch by command
- [ ] Full session logged; summary generated after live

## Sprint 2 — Live co-host

- TikTok + Kick chat adapters completed
- Nova co-host conversational loop (chat + voice)
- Session memory + moderation rules
- Director mode (basic live strategy)
- Workflow engine v1 (declarative workflows)
- OBS scene automation
- Notes integration (Obsidian) + RAG over creator notes

## Sprint 3 — The crew

- All agents online: Producer, Researcher, Translator, Analyst
- Multi-agent orchestration (routing, delegation, priorities)
- Analytics: live signals, highlights detector
- Content generator: clips, summaries, titles
- Creator dashboard + permissions UI

## Sprint 4+ — Platform

- Plugin SDK + example plugins + marketplace
- Community agents
- Telemetry / observability for contributors
- Contributor onboarding guide, changelog, contribution standards

## Principles that persist

- No feature without an agent.
- No agent without a workflow.
- Provider agnostic, plugin first, human in control, privacy by design, offline first.
