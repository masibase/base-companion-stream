# AGENTS.md — Contract for coding agents

Agent Companion is a modular Agent OS for creators. Keep it modular.

## Golden rules

1. **No feature without an agent.** Every feature is owned by exactly one agent module.
2. **No agent without a workflow.** Every agent action runs through a declared workflow in `docs/WORKFLOWS.md`.
3. **Events over direct calls.** Modules communicate through the event bus (`core/event-bus`), never by importing each other.
4. **Provider agnostic.** AI vendors live behind `core/provider-manager` interfaces. Never hardcode a vendor SDK outside a provider adapter.
5. **Human in control.** Anything affecting the stream or the creator's machine passes `core/permission-manager` (auto / ask / deny).

## Commands

- `pnpm install` (jika `pnpm` tidak di PATH, pakai `corepack pnpm ...`)
- `pnpm dev` — desktop app
- `pnpm test` / `pnpm lint` / `pnpm typecheck`
- Add dep to a package: `pnpm --filter <pkg> add <dep>`

## Structure

- `apps/` — desktop (Tauri), overlay, launcher
- `core/` — orchestrator, event-bus, workflow-engine, provider-manager, plugin-manager, permission-manager, config, runtime
- `agents/` — one folder per agent (nova, director, producer, moderator, researcher, translator, analyst, manager)
- `services/` — one folder per capability (stt, tts, wake-word, chat-adapters, obs, logging, memory, summary)
- `plugins/` — third-party extensions
- `docs/` — keep docs in sync when behavior changes

Each agent = one folder with: `index.ts` (event handlers), `agent.ts` (decision logic), `prompt.ts` (system prompt), `*.test.ts`.

## Definition of done

- Feature owned by an agent with a workflow (`docs/WORKFLOWS.md`)
- Events documented in `docs/API.md`
- Config entries documented in `docs/CONFIG.md`
- Tests for decision logic (vitest, no network)
- `pnpm lint` + `pnpm typecheck` pass
