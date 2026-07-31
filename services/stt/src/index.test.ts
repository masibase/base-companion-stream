import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAISTT } from "./index";

describe("OpenAISTT", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts audio to /audio/transcriptions", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "hello world" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const stt = new OpenAISTT({ apiKey: "sk-test" });
    const text = await stt.transcribe(new Blob(["audio-data"]), {
      language: "en",
    });
    expect(text).toBe("hello world");
    const call = fetchMock.mock.calls[0];
    const headers = (call?.[1]?.headers ?? {}) as Record<string, string>;
    expect(String(call?.[0])).toBe(
      "https://api.openai.com/v1/audio/transcriptions",
    );
    expect(headers.Authorization).toBe("Bearer sk-test");
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("ping returns false on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await new OpenAISTT({ apiKey: "x" }).ping()).toBe(false);
  });
});
