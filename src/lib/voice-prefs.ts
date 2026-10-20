/** Browser-safe voice and orb preferences, stored on this device. */
export const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
] as const;
export const DEFAULT_VOICE = VOICES[0].id;
export const isVoiceId = (v: unknown): v is string => VOICES.some((x) => x.id === v);

export const ORB_COLORS = ["signal", "time", "money", "body", "rose", "violet"] as const;
export type OrbColor = (typeof ORB_COLORS)[number];
export const ORB_STYLES = ["glow", "minimal"] as const;
export type OrbStyle = (typeof ORB_STYLES)[number];

export type VoicePrefs = { voice: string; orbColor: OrbColor; orbStyle: OrbStyle };
const KEY = "zero-voice-prefs";
export function readVoicePrefs(): VoicePrefs {
  const base: VoicePrefs = { voice: DEFAULT_VOICE, orbColor: "signal", orbStyle: "glow" };
  if (typeof window === "undefined") return base;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      voice: isVoiceId(p.voice) ? p.voice : base.voice,
      orbColor: ORB_COLORS.includes(p.orbColor) ? p.orbColor : base.orbColor,
      orbStyle: ORB_STYLES.includes(p.orbStyle) ? p.orbStyle : base.orbStyle,
    };
  } catch { return base; }
}
export function saveVoicePrefs(p: VoicePrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("zero-voice-prefs"));
}
/** CSS colour for the orb accent. */
export function orbColorValue(c: OrbColor) {
  return c === "rose" || c === "violet" ? `var(--orb-${c})` : `var(--${c})`;
}
