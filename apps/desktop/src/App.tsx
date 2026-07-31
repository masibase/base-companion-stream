import type { Runtime } from "@agent/runtime";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { getRuntime } from "./runtime";
import "./App.css";

interface Card {
  name: string;
  state: string;
}

function runtimeCards(runtime: Runtime): Card[] {
  const cfg = runtime.config.get();
  return [
    {
      name: "Config Manager",
      state: `v${cfg.version} — profile "${cfg.profile.name}"`,
    },
    {
      name: "Provider Manager",
      state: runtime.providers.list().join(", ") || "none registered",
    },
    {
      name: "Chat adapters",
      state:
        ["youtube", "twitch", "tiktok", "kick"]
          .filter((p) => runtime.hub.get(p))
          .join(", ") || "none connected",
    },
    {
      name: "OBS bridge",
      state: cfg.obs.enabled
        ? `ws://${cfg.obs.host}:${cfg.obs.port} (enabled)`
        : "disabled",
    },
    {
      name: "Voice engine",
      state: `wake "${cfg.voice.wakeWord}" — STT/TTS pending wiring`,
    },
    {
      name: "Memory + Summary",
      state: `session ${runtime.memory.id} — ${runtime.memory.all().length} events`,
    },
  ];
}

export default function App() {
  const [version, setVersion] = useState("");
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [summary, setSummary] = useState<{ messageCount: number } | null>(null);

  useEffect(() => {
    invoke<string>("app_version")
      .then(setVersion)
      .catch(() => setVersion("browser preview"));
    getRuntime()
      .then((rt) => {
        rt.bus.on("summary.ready", (e) =>
          setSummary(e.payload as { messageCount: number }),
        );
        setRuntime(rt);
      })
      .catch((err) => setBootError(String(err)));
  }, []);

  const endSession = () => {
    void runtime?.stop().then(() => setSessionEnded(true));
  };

  const cards = runtime ? runtimeCards(runtime) : [];

  return (
    <main className="dashboard">
      <header>
        <h1>Agent Companion</h1>
        {version && <span className="version">v{version}</span>}
      </header>
      {bootError ? (
        <p className="state error">{bootError}</p>
      ) : (
        <section className="grid">
          {(cards.length ? cards : []).map((c) => (
            <article key={c.name} className="card">
              <h2>{c.name}</h2>
              <p className="state">{c.state}</p>
            </article>
          ))}
          <article className="card">
            <h2>Session</h2>
            <p className="state">
              {!runtime
                ? "booting…"
                : sessionEnded
                  ? "ended"
                  : `live — ${runtime.memory.all().length} events recorded`}
            </p>
            {summary && (
              <p className="state muted">
                summary: {summary.messageCount} chat messages
              </p>
            )}
            <div className="controls">
              <button
                type="button"
                className="btn"
                disabled={!runtime || sessionEnded}
                onClick={endSession}
              >
                End Session
              </button>
              {sessionEnded && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => window.location.reload()}
                >
                  Start New Session
                </button>
              )}
            </div>
          </article>
        </section>
      )}
      <p className="hint">
        Runtime boots from config.json (%APPDATA%/agent-companion) with secrets
        in Windows Credential Manager (keyring). OBS, chat, and providers follow
        config; nothing connected by default.
      </p>
    </main>
  );
}
