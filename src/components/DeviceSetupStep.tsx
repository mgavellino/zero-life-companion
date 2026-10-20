import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
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
    </section>
    {installOk && pushSupported && <section className="rounded-2xl border p-4">
      <h2 className="font-semibold">{t("deviceSetup.push")}</h2>
      {push && <p className="mt-2 flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-primary" />{t("deviceSetup.pushDone")}</p>}
      <PushSettings embedded onEnabledChange={setPush} />
    </section>}
    {blockedByBrowser && <p className="text-xs text-muted-foreground">{t("deviceSetup.unsupported")}</p>}
  </>;
}
