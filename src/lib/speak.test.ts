import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { speak, stopSpeaking } from "./speak";

afterEach(() => {
  stopSpeaking();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("voice playback volume", () => {
  it("restores premium playback to full volume, unmutes it and selects speaker playback", async () => {
    const session = { type: "play-and-record" };
    vi.stubGlobal("navigator", { audioSession: session });
    const audio = {
      volume: 0.2, muted: true, src: "", preload: "", duration: 1,
      setAttribute: vi.fn(), removeAttribute: vi.fn(), load: vi.fn(), pause: vi.fn(),
      onended: null as null | (() => void),
      play: vi.fn(async () => { queueMicrotask(() => audio.onended?.()); }),
    };
    vi.stubGlobal("Audio", class { constructor() { return audio; } });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["audio"]) })));
    vi.stubGlobal("URL", { createObjectURL: () => "blob:voice", revokeObjectURL: vi.fn() });
    expect(await speak("Olá", "pt")).toBe("premium");
    expect(audio.volume).toBe(1);
    expect(audio.muted).toBe(false);
    expect(session.type).toBe("playback");
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it("uses full volume and the playback session for the browser fallback", async () => {
    const session = { type: "play-and-record" };
    vi.stubGlobal("navigator", { audioSession: session });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      volume = 0.2;
      constructor(public text: string) {}
    });
    const spoken: { volume: number; onend: () => void }[] = [];
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [{ lang: "pt-BR", name: "Luciana" }],
      cancel: vi.fn(), resume: vi.fn(),
      speak: (utterance: { volume: number; onend: () => void }) => {
        spoken.push(utterance);
        queueMicrotask(() => utterance.onend());
      },
    });
    expect(await speak("Olá", "pt")).toBe("basic");
    expect(spoken).toHaveLength(1);
    expect(spoken[0]?.volume).toBe(1);
    expect(session.type).toBe("playback");
  });
});