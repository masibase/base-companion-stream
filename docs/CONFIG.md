# Config

Managed by the Configuration Manager. Stored at
`%APPDATA%/agent-companion/config.json` (Windows). Export/import supported;
secrets are never stored here (see `docs/SECURITY.md`).

## Schema (v1)

```jsonc
{
  "version": 1,
  "profile": { "name": "my-stream", "language": "en" },

  "providers": {
    "primary": { "id": "openai", "model": "gpt-4o-mini", "keyRef": "keyring:openai" },
    "local": { "id": "ollama", "model": "llama3.1", "baseUrl": "http://localhost:11434" }
  },

  "voice": {
    "wakeWord": "nova",
    "stt": "whisper-local",
    "tts": "edge-tts",
    "language": "en-US",
    "autoListen": true,
    "micDevice": "default"
  },

  "chat": {
    "youtube": { "enabled": false, "videoId": "", "replyPolicy": "approve" },
    "twitch": { "enabled": false, "channel": "", "replyPolicy": "auto" },
    "tiktok": { "enabled": false, "username": "", "replyPolicy": "deny" },
    "kick": { "enabled": false, "channel": "", "replyPolicy": "deny" }
  },

  "obs": { "enabled": true, "host": "localhost", "port": 4455, "passwordRef": "keyring:obs" },

  "overlay": { "enabled": true, "port": 7935, "theme": "dark" },

  "logging": { "level": "info", "retentionDays": 30 },

  "permissions": {
    "obs.sceneSwitch": "auto",
    "obs.sourceControl": "ask",
    "chat.reply": "approve",
    "tokens.spend": "ask",
    "session.start": "auto",
    "session.end": "auto"
  }
}
```

## Config Manager behavior

- Load on boot → validate against schema → emit `config.loaded`
- Runtime changes → emit `config.changed` → affected services hot-reload
- Export strips secrets; import merges (never overwrites keyring)
