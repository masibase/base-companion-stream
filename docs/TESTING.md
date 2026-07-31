# Testing

## Layers

| Layer | Tool | Covers |
|---|---|---|
| Unit | vitest | `core/`: event-bus, orchestrator, workflow-engine, provider-manager, permission-manager — with mocked providers/adapters, no network |
| Agent | vitest | each agent's decision logic: intent → routing → emitted events, fed with canned events |
| Integration | vitest + mock servers | chat adapters against fixture event streams; OBS bridge against a mock WebSocket server |
| Hardware (manual) | checklist | mic + wake word, TTS voice output, real OBS connection, overlay visible over streaming software |

## Rules

- Decision logic always tested (agents, workflow engine, permission modes).
- Unit tests never hit the network; providers and adapters are mocked.
- An agent without a test is an unfinished agent.
- Run: `pnpm test` / `pnpm lint` / `pnpm typecheck` before merge.

## Hardware checklist (Sprint 1 sign-off)

- [ ] Wake word "Nova" triggers listen mode
- [ ] Speech → STT transcript correct
- [ ] TTS plays through default output device
- [ ] Chat message triggers Nova reply (YouTube + Twitch)
- [ ] OBS connects with password auth; scene switch works
- [ ] Overlay shows status + transcript during live
- [ ] Session log complete; post-live summary generated
