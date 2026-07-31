export interface TTS {
  readonly id: string;
  speak(text: string): Promise<void>;
  stop(): void;
  available(): boolean;
}

export interface SpeechSynthesisUtteranceLike {
  text: string;
  lang: string;
  onend: (() => void) | null;
}

export interface SpeechSynthesisLike {
  speak(utterance: SpeechSynthesisUtteranceLike): void;
  cancel(): void;
}

export class WebSpeechTTS implements TTS {
  readonly id = "webspeech";

  constructor(private synth: SpeechSynthesisLike | undefined) {}

  available(): boolean {
    return this.synth !== undefined;
  }

  speak(text: string): Promise<void> {
    const synth = this.synth;
    if (!synth)
      return Promise.reject(new Error("speech synthesis unavailable"));
    return new Promise((resolve) => {
      const utterance: SpeechSynthesisUtteranceLike = {
        text,
        lang: "en-US",
        onend: null,
      };
      utterance.onend = () => resolve();
      synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth?.cancel();
  }
}
