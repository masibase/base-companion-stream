import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import "./App.css";

interface ServiceStatus {
  name: string;
  state: string;
}

const INITIAL_STATUS: ServiceStatus[] = [
  { name: "Config Manager", state: "loading…" },
  { name: "Provider Manager (OpenAI, Ollama)", state: "loading…" },
  { name: "Chat adapters (YouTube, Twitch, TikTok, Kick)", state: "loading…" },
  { name: "OBS bridge (WebSocket v5)", state: "loading…" },
  { name: "Voice engine (STT / TTS / wake word)", state: "loading…" },
  { name: "Memory + Summary", state: "loading…" },
];

export default function App() {
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState(INITIAL_STATUS);

  useEffect(() => {
    void invoke<string>("app_version").then(setVersion);
    void fetch("http://localhost:7935/health")
      .then((res) => res.json())
      .then((data: { ok?: boolean }) => {
        setStatus((prev) =>
          prev.map((s) =>
            s.name === "Memory + Summary"
              ? {
                  ...s,
                  state: data.ok ? "overlay reachable" : "overlay offline",
                }
              : s,
          ),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <main className="dashboard">
      <header>
        <h1>Agent Companion</h1>
        {version && <span className="version">v{version}</span>}
      </header>
      <section className="grid">
        {status.map((s) => (
          <article key={s.name} className="card">
            <h2>{s.name}</h2>
            <p className="state">{s.state}</p>
          </article>
        ))}
      </section>
      <p className="hint">
        Sprint 1 foundation — core engine, chat adapters, OBS bridge, and agents
        are wired in the monorepo. Services connect once configured in Settings.
      </p>
    </main>
  );
}
