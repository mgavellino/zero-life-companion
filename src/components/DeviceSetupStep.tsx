import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "./ui/button";
import winExe from "@/assets/downloads/ZeroSetup.exe.asset.json";
import macArm from "@/assets/downloads/Zero-mac-arm64.dmg.asset.json";
import macIntel from "@/assets/downloads/Zero-mac-x64.dmg.asset.json";
import { InstallZero } from "./InstallZero";
import { PushSettings } from "./PushSettings";

export type DeviceReadiness = { ready: boolean };

/** Onboarding step: mobile users must install the app and enable alerts; browsers that can't do either may continue. */
export function DeviceSetupStep({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const { t } = useTranslation();
  const [installed, setInstalled] = useState(false), [push, setPush] = useState(false);
  const [mobile, setMobile] = useState(false), [pushSupported, setPushSupported] = useState(true), [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    const check = () => setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    check();
    setMobile(/android|iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent)));
    setEmbedded(window.top !== window.self);
    window.addEventListener("appinstalled", check);
    return () => window.removeEventListener("appinstalled", check);
  }, []);
  useEffect(() => {
    // iOS only exposes push inside the installed app, so support is judged after install there.
    setPushSupported("Notification" in window && "serviceWorker" in navigator && "PushManager" in window);
  }, [installed]);
  const ios = mobile && /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent);
  const installOk = installed || !mobile;
  const blockedByBrowser = embedded || (!pushSupported && !(ios && !installed));
  const ready = blockedByBrowser || (installOk && push);
  useEffect(() => { onReadyChange(ready); }, [ready, onReadyChange]);

  return <>
    <p className="text-sm text-muted-foreground">{t("deviceSetup.body")}</p>
    <section className="rounded-2xl border p-4">
      <h2 className="font-semibold">{t("deviceSetup.install")}</h2>
      {installed ? <p className="mt-2 flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-primary" />{t("deviceSetup.installed")}</p> : <div className="mt-2"><InstallZero />{mobile && <p className="mt-2 text-xs text-muted-foreground">{t("deviceSetup.required")}</p>}</div>}
      {!mobile && <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        <Button asChild variant="outline" size="sm"><a href={winExe.url} download="ZeroSetup.exe"><Download className="size-4" />{t("landing.dlExe")}</a></Button>
        <Button asChild variant="outline" size="sm"><a href={macArm.url} download="Zero-mac-arm64.dmg"><Download className="size-4" />{t("landing.dlMacArm")}</a></Button>
        <Button asChild variant="outline" size="sm"><a href={macIntel.url} download="Zero-mac-x64.dmg"><Download className="size-4" />{t("landing.dlMacIntel")}</a></Button>
      </div>}
    </section>
    {installOk && pushSupported && <section className="rounded-2xl border p-4">
      <h2 className="font-semibold">{t("deviceSetup.push")}</h2>
      {push && <p className="mt-2 flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-primary" />{t("deviceSetup.pushDone")}</p>}
      <PushSettings embedded onEnabledChange={setPush} />
    </section>}
    {blockedByBrowser && <p className="text-xs text-muted-foreground">{t("deviceSetup.unsupported")}</p>}
  </>;
}
