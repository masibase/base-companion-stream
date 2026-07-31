import { describe, expect, it } from "vitest";
import { type SpeechSynthesisLike, WebSpeechTTS } from "./index";

function fakeSynth(): SpeechSynthesisLike & { spoken: string[] } {
  const spoken: string[] = [];
  return {
    spoken,
    speak(utterance) {
      spoken.push(utterance.text);
      utterance.onend?.();
    },
    cancel() {},
  };
}

describe("WebSpeechTTS", () => {
  it("speaks and resolves when utterance ends", async () => {
    const synth = fakeSynth();
    const tts = new WebSpeechTTS(synth);
    expect(tts.available()).toBe(true);
    await tts.speak("hello chat");
    expect(synth.spoken).toEqual(["hello chat"]);
  });

  it("reports unavailable without a synthesizer", async () => {
    const tts = new WebSpeechTTS(undefined);
    expect(tts.available()).toBe(false);
    await expect(tts.speak("x")).rejects.toThrow("unavailable");
  });
});
