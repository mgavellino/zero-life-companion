/**
 * Hands-free recorder for phones where the browser's speech recognition is unreliable (iPhone).
 * The mic stays open for the whole conversation; speech is detected by volume and each
 * utterance is returned as an audio blob for server-side transcription.
 */
export class VadRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private raf = 0;
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private speaking = false;
  private lastVoice = 0;
  private startedAt = 0;
  active = false;
  constructor(private onUtterance: (audio: Blob) => void, private onLevel?: (level: number) => void) {}

  /** Must be called from a tap the first time. */
  async open() {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    this.ctx.createMediaStreamSource(this.stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) { const x = (v - 128) / 128; sum += x * x; }
      const rms = Math.sqrt(sum / data.length);
      this.onLevel?.(rms);
      if (!this.active) return;
      const now = performance.now();
      if (rms > 0.035) {
        this.lastVoice = now;
        if (!this.speaking) this.begin();
      } else if (this.speaking && now - this.lastVoice > 1300) {
        this.end(now - this.startedAt > 600);
      }
      if (this.speaking && now - this.startedAt > 30_000) this.end(true);
    };
    loop();
  }
  private begin() {
    if (!this.stream) return;
    this.speaking = true;
    this.startedAt = performance.now();
    this.chunks = [];
    const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t));
    this.rec = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start(250);
  }
  private end(keep: boolean) {
    this.speaking = false;
    const rec = this.rec;
    this.rec = null;
    if (!rec) return;
    rec.onstop = () => { if (keep && this.chunks.length) this.onUtterance(new Blob(this.chunks, { type: rec.mimeType || "audio/mp4" })); };
    try { rec.stop(); } catch { /* already stopped */ }
  }
  resume() { if (this.ctx?.state === "suspended") void this.ctx.resume(); this.active = true; }
  /** Stops listening (assistant thinking/speaking) without closing the mic. */
  pause() { this.active = false; if (this.speaking) this.end(false); }
  close() {
    this.pause();
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.stream = null; this.ctx = null;
  }
}

/** Every phone/browser that can record uses Groq transcription; browser recognition is only a fallback. */
export function prefersRecorder() {
  return typeof navigator !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
