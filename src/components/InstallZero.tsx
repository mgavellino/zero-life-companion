import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallZero() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const update = () => setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    update();
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", complete); };
  }, []);
  return <>
    <Button variant="ghost" className="justify-start gap-3" onClick={() => setOpen(true)}><Download className="size-4 shrink-0" />{installed ? t("install.device") : t("install.action")}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("install.title")}</DialogTitle><DialogDescription>{installed ? t("install.installed") : t("install.description")}</DialogDescription></DialogHeader>
        {prompt && !installed && <Button onClick={async () => { await prompt.prompt(); const choice = await prompt.userChoice; setPrompt(null); if (choice.outcome === "accepted") setOpen(false); }}><Download className="size-4" />{t("install.installDevice")}</Button>}
        <section className="min-w-0 border-b pb-4"><h3 className="flex items-center gap-2 font-semibold"><Smartphone className="size-4" />{t("install.chrome")}</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>{t("install.android1")}</li><li>{t("install.android2")}</li><li>{t("install.android3")}</li></ol></section>
        <section className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><Share className="size-4" />{t("install.safari")}</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>{t("install.ios1")}</li><li>{t("install.ios2")}</li><li>{t("install.ios3")}</li><li>{t("install.ios4")}</li></ol></section>
        <p className="text-xs text-muted-foreground">{t("install.note")}</p>
      </DialogContent>
    </Dialog>
  </>;
}