export interface STT {
  readonly id: string;
  transcribe(audio: Blob, opts?: { language?: string }): Promise<string>;
  ping(): Promise<boolean>;
}

export interface OpenAISTTConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export class OpenAISTT implements STT {
  readonly id = "openai";

  constructor(private cfg: OpenAISTTConfig) {}

  private get base(): string {
    return this.cfg.baseUrl ?? "https://api.openai.com/v1";
  }

  async transcribe(
    audio: Blob,
    opts: { language?: string } = {},
  ): Promise<string> {
    const form = new FormData();
    form.append("file", audio, "audio.webm");
    form.append("model", this.cfg.model ?? "whisper-1");
    if (opts.language) form.append("language", opts.language);
    const res = await fetch(`${this.base}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
      body: form,
    });
    if (!res.ok)
      throw new Error(`stt error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { text: string };
    return data.text;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.base}/models`, {
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
