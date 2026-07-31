# Workflows

Every workflow is a declared, versioned sequence: trigger → guard → steps →
events. New features must add a workflow here before code ships.

## Workflow registry

| ID | Workflow | Owner agent | Trigger |
|---|---|---|---|
| W-01 | Live chat response | nova | `chat.message` |
| W-02 | Voice command / wake word | nova | `voice.wakeword` |
| W-03 | OBS control | producer (approved by director) | `command.obs` |
| W-04 | Translation | translator | `chat.message` (needs translation) |
| W-05 | Moderation | moderator | `chat.message` (rule hit) |
| W-06 | Post-live summary | analyst | `session.ended` |
| W-07 | Memory save | manager | every significant event |

## W-01 — Live chat response

1. `chat.message` arrives on the event bus
2. Guard: permission scope + rate limit (`permission-manager`)
3. Nova classifies intent; routes to needed agents (researcher / translator / moderator)
4. Response generated via `provider-manager` (primary or local provider)
5. Emit `response.ready` → TTS if voice mode → overlay update → reply via chat adapter if allowed
6. Log event; memory save (W-07)

## W-02 — Wake word / voice command

1. Mic stream → wake-word detects "Nova"
2. STT transcribes the command
3. Emit `voice.command`; intent parsed
4. Route through same pipeline as W-01; TTS reply always active

## W-03 — OBS control

1. `command.obs` (from chat or creator) → validate syntax + permission scope
2. Director/Producer approve or deny → emit decision
3. OBS service executes via obs-websocket-js → emit `obs.changed`
4. Log

## W-04 — Translation

1. Nova flags message needing translation
2. Translator translates with provider, preserves tone/emotes context
3. Emit `translation.result` → overlay + optional chat reply

## W-05 — Moderation

1. Rule hit detected (or Nova delegates)
2. Moderator classifies severity: hold / warn / mute / ignore
3. Held messages go to creator approval queue (human in control)
4. Emit `moderation.action` → log

## W-06 — Post-live summary

1. `session.ended` → collect session events from logging
2. Analyst: highlights, stats, chat themes, viewer signals
3. Emit `summary.ready` → save to storage → show in dashboard

## W-07 — Memory save

1. Any significant event (chat reply, decision, OBS action, summary)
2. Manager normalizes + stores in session memory
3. Used later for context (Sprint 2+) and summaries
