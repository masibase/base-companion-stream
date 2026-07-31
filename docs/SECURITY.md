# Security

## Secrets

- API keys never live in config files, code, or logs.
- Keys are stored in the OS keyring at runtime (Tauri plugin on the JS side,
  `keyring` crate on the Rust side). Config stores a reference only
  (`keyRef: "keyring:openai"`).
- `core/provider-manager` is the only module that reads provider credentials.

## Permissions

Every dangerous action passes `core/permission-manager` with a scope + mode:

| Mode | Behavior |
|---|---|
| `auto` | allowed without asking |
| `ask` | creator must approve (UI prompt) |
| `deny` | refused, logged |

Sensitive scopes: `obs.sceneSwitch`, `obs.sourceControl`, `chat.reply`,
`tokens.spend`, `session.start`, `session.end`.

## Moderation

- Flagged messages go to a hold queue; creator approves before any action.
- No auto-mute or auto-ban without an explicit policy rule.
- All moderation decisions are logged.

## Data & privacy

- Local-first: session logs, transcripts, memory stay on the machine by default.
- Export/import of config strips secrets.
- No telemetry unless explicitly enabled.

## Tauri hardening

- Capabilities per window with least privilege (see
  `apps/desktop/src-tauri/capabilities/`).
- No shell/process permissions unless a feature requires them.
- Overlay binds to loopback only.
