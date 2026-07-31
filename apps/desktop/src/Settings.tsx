import type { AppConfig } from "@agent/config";
import type { Runtime } from "@agent/runtime";
import { invoke } from "@tauri-apps/api/core";
import { type FormEvent, useState } from "react";

interface SettingsProps {
  runtime: Runtime;
}

interface FormState {
  profileName: string;
  openaiKey: string;
  youtubeEnabled: boolean;
  youtubeVideoId: string;
  youtubeKey: string;
  twitchEnabled: boolean;
  twitchChannel: string;
  twitchToken: string;
  tiktokEnabled: boolean;
  tiktokUsername: string;
  tiktokBaseUrl: string;
  kickEnabled: boolean;
  kickChannel: string;
  kickBaseUrl: string;
  obsEnabled: boolean;
  obsPassword: string;
  replyMode: string;
  sceneMode: string;
  sourceMode: string;
}

function fromConfig(cfg: AppConfig): FormState {
  return {
    profileName: cfg.profile.name,
    openaiKey: "",
    youtubeEnabled: cfg.chat.youtube.enabled,
    youtubeVideoId: cfg.chat.youtube.videoId,
    youtubeKey: "",
    twitchEnabled: cfg.chat.twitch.enabled,
    twitchChannel: cfg.chat.twitch.channel,
    twitchToken: "",
    tiktokEnabled: cfg.chat.tiktok.enabled,
    tiktokUsername: cfg.chat.tiktok.username,
    tiktokBaseUrl: cfg.chat.tiktok.baseUrl,
    kickEnabled: cfg.chat.kick.enabled,
    kickChannel: cfg.chat.kick.channel,
    kickBaseUrl: cfg.chat.kick.baseUrl,
    obsEnabled: cfg.obs.enabled,
    obsPassword: "",
    replyMode: cfg.permissions["chat.reply"],
    sceneMode: cfg.permissions["obs.sceneSwitch"],
    sourceMode: cfg.permissions["obs.sourceControl"],
  };
}

async function setKey(
  runtime: Runtime,
  key: string,
  value: string,
): Promise<void> {
  if (!value) return;
  await invoke("keyring_set", { key, value });
  runtime.logger.info("keyring.set", { key });
}

export default function Settings({ runtime }: SettingsProps) {
  const [form, setForm] = useState(() => fromConfig(runtime.config.get()));
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await setKey(runtime, "openai", form.openaiKey);
      await setKey(runtime, "youtube", form.youtubeKey);
      await setKey(runtime, "twitch", form.twitchToken);
      await setKey(runtime, "obs", form.obsPassword);
      await runtime.config.update({
        profile: { name: form.profileName },
        chat: {
          youtube: {
            enabled: form.youtubeEnabled,
            videoId: form.youtubeVideoId,
          },
          twitch: { enabled: form.twitchEnabled, channel: form.twitchChannel },
          tiktok: {
            enabled: form.tiktokEnabled,
            username: form.tiktokUsername,
            baseUrl: form.tiktokBaseUrl,
          },
          kick: {
            enabled: form.kickEnabled,
            channel: form.kickChannel,
            baseUrl: form.kickBaseUrl,
          },
        },
        obs: { enabled: form.obsEnabled },
        permissions: {
          "chat.reply": form.replyMode,
          "obs.sceneSwitch": form.sceneMode,
          "obs.sourceControl": form.sourceMode,
        },
      });
      runtime.perms.setMode("chat.reply", form.replyMode as never);
      runtime.perms.setMode("obs.sceneSwitch", form.sceneMode as never);
      runtime.perms.setMode("obs.sourceControl", form.sourceMode as never);
      setSaved(true);
    } catch (err) {
      runtime.logger.error("settings.save.failed", { error: String(err) });
    }
  };

  return (
    <form className="settings" onSubmit={onSave}>
      <h2>Settings</h2>
      <p className="hint">
        Secrets go to Windows Credential Manager (keyring); everything else to
        config.json. Restart the app to apply chat/OBS changes.
      </p>

      <label>
        Profile name
        <input
          value={form.profileName}
          onChange={(e) => set("profileName", e.target.value)}
        />
      </label>

      <label>
        OpenAI API key
        <input
          type="password"
          value={form.openaiKey}
          onChange={(e) => set("openaiKey", e.target.value)}
        />
      </label>

      <fieldset>
        <legend>YouTube</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={form.youtubeEnabled}
            onChange={(e) => set("youtubeEnabled", e.target.checked)}
          />
          enabled
        </label>
        <label>
          Video ID
          <input
            value={form.youtubeVideoId}
            onChange={(e) => set("youtubeVideoId", e.target.value)}
          />
        </label>
        <label>
          Google API key
          <input
            type="password"
            value={form.youtubeKey}
            onChange={(e) => set("youtubeKey", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Twitch</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={form.twitchEnabled}
            onChange={(e) => set("twitchEnabled", e.target.checked)}
          />
          enabled
        </label>
        <label>
          Channel
          <input
            value={form.twitchChannel}
            onChange={(e) => set("twitchChannel", e.target.value)}
          />
        </label>
        <label>
          OAuth token (optional, for replying)
          <input
            type="password"
            value={form.twitchToken}
            onChange={(e) => set("twitchToken", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>TikTok</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={form.tiktokEnabled}
            onChange={(e) => set("tiktokEnabled", e.target.checked)}
          />
          enabled
        </label>
        <label>
          Username
          <input
            value={form.tiktokUsername}
            onChange={(e) => set("tiktokUsername", e.target.value)}
          />
        </label>
        <label>
          Chat proxy base URL (unofficial API)
          <input
            value={form.tiktokBaseUrl}
            onChange={(e) => set("tiktokBaseUrl", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Kick</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={form.kickEnabled}
            onChange={(e) => set("kickEnabled", e.target.checked)}
          />
          enabled
        </label>
        <label>
          Channel
          <input
            value={form.kickChannel}
            onChange={(e) => set("kickChannel", e.target.value)}
          />
        </label>
        <label>
          Chat proxy base URL (unofficial API)
          <input
            value={form.kickBaseUrl}
            onChange={(e) => set("kickBaseUrl", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>OBS</legend>
        <label className="row">
          <input
            type="checkbox"
            checked={form.obsEnabled}
            onChange={(e) => set("obsEnabled", e.target.checked)}
          />
          enabled
        </label>
        <label>
          WebSocket password
          <input
            type="password"
            value={form.obsPassword}
            onChange={(e) => set("obsPassword", e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Permissions</legend>
        <label className="row">
          <span className="muted">chat.reply</span>
          <select
            value={form.replyMode}
            onChange={(e) => set("replyMode", e.target.value)}
          >
            <option value="auto">auto</option>
            <option value="ask">ask</option>
            <option value="deny">deny</option>
          </select>
        </label>
        <label className="row">
          <span className="muted">obs.sceneSwitch</span>
          <select
            value={form.sceneMode}
            onChange={(e) => set("sceneMode", e.target.value)}
          >
            <option value="auto">auto</option>
            <option value="ask">ask</option>
            <option value="deny">deny</option>
          </select>
        </label>
        <label className="row">
          <span className="muted">obs.sourceControl</span>
          <select
            value={form.sourceMode}
            onChange={(e) => set("sourceMode", e.target.value)}
          >
            <option value="auto">auto</option>
            <option value="ask">ask</option>
            <option value="deny">deny</option>
          </select>
        </label>
      </fieldset>

      <button type="submit" className="btn">
        Save
      </button>
      {saved && (
        <span className="state">saved — restart to apply chat/OBS</span>
      )}
    </form>
  );
}
