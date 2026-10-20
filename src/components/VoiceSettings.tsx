import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { Card } from "./Page";
import { Button } from "./ui/button";
import { ZeroRing } from "./Logo";
import { cn } from "@/lib/utils";
import { speak, unlockAudio } from "@/lib/speak";
import { DEFAULT_VOICE, ORB_COLORS, ORB_STYLES, VOICES, orbColorValue, readVoicePrefs, saveVoicePrefs, type VoicePrefs } from "@/lib/voice-prefs";

export function VoiceSettings() {
  const { t, i18n } = useTranslation();
  const [p, setP] = useState<VoicePrefs>({ voice: DEFAULT_VOICE, orbColor: "signal", orbStyle: "glow" });
  useEffect(() => setP(readVoicePrefs()), []);
  const update = (next: Partial<VoicePrefs>) => { const v = { ...p, ...next }; setP(v); saveVoicePrefs(v); };
  return <Card className="mb-6">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("voicePrefs.title")}</p>
    <div className="mt-4 flex justify-center"><div style={{ "--signal": orbColorValue(p.orbColor) } as React.CSSProperties} className={cn("voice-orb relative grid size-24 place-items-center rounded-full is-idle", p.orbStyle === "minimal" && "orb-minimal")}><ZeroRing className="size-8" /></div></div>
    <label className="mt-4 block space-y-2"><span className="text-sm font-medium">{t("voicePrefs.voice")}</span>
      <div className="flex gap-2"><select aria-label={t("voicePrefs.voice")} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2" value={p.voice} onChange={(e) => update({ voice: e.target.value })}>{VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <Button type="button" variant="outline" size="sm" onClick={() => { unlockAudio(); void speak(t("chat2.assistant"), i18n.language); }}><Play className="size-4" />{t("voicePrefs.preview")}</Button></div>
      <span className="block text-xs text-muted-foreground">{t("voicePrefs.premium")}</span>
    </label>
    <p className="mt-4 text-sm font-medium">{t("voicePrefs.color")}</p>
    <div className="mt-2 flex flex-wrap gap-2">{ORB_COLORS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={p.orbColor === c} onClick={() => update({ orbColor: c })} style={{ background: orbColorValue(c) }} className={cn("size-9 rounded-full border-2", p.orbColor === c ? "border-foreground" : "border-transparent")} />)}</div>
    <p className="mt-4 text-sm font-medium">{t("voicePrefs.style")}</p>
    <div className="mt-2 flex gap-2">{ORB_STYLES.map((s) => <Button key={s} type="button" size="sm" variant={p.orbStyle === s ? "default" : "outline"} onClick={() => update({ orbStyle: s })}>{t(`voicePrefs.${s === "glow" ? "glow" : "minimal"}`)}</Button>)}</div>
  </Card>;
}
