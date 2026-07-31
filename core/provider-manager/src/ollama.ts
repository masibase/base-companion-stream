import type { ChatMessage, ChatOptions, Provider } from "./types";

export interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
}

export class OllamaProvider implements Provider {
  readonly id = "ollama";

  constructor(private cfg: OllamaConfig = {}) {}

  private get base(): string {
    return this.cfg.baseUrl ?? "http://localhost:11434";
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const res = await fetch(`${this.base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model ?? this.cfg.defaultModel ?? "llama3.1",
        messages,
        stream: false,
      }),
    });
    if (!res.ok)
      throw new Error(`ollama error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message: { content: string } };
    return data.message.content;
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.base}/api/tags`);
    if (!res.ok) throw new Error(`ollama error ${res.status}`);
    const data = (await res.json()) as { models: Array<{ name: string }> };
    return data.models.map((m) => m.name);
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }
}
