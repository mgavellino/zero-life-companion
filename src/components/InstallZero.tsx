import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallZero() {
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
    <Button variant="ghost" className="justify-start gap-3" onClick={() => setOpen(true)}><Download className="size-4 shrink-0" />{installed ? "Zero neste aparelho" : "Instalar Zero"}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Zero na Tela de Início</DialogTitle><DialogDescription>{installed ? "Você já está usando o Zero pela Tela de Início." : "Adicione um ícone do Zero ao seu celular ou tablet, sem passar pelas lojas."}</DialogDescription></DialogHeader>
        {prompt && !installed && <Button onClick={async () => { await prompt.prompt(); const choice = await prompt.userChoice; setPrompt(null); if (choice.outcome === "accepted") setOpen(false); }}><Download className="size-4" />Instalar neste aparelho</Button>}
        <section className="min-w-0 border-b pb-4"><h3 className="flex items-center gap-2 font-semibold"><Smartphone className="size-4" />Chrome · Android</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>Abra o endereço do Zero no Chrome, em sua própria aba.</li><li>Toque nos três pontos ⋮ e escolha “Adicionar à tela inicial” ou “Instalar app”.</li><li>Confirme e abra o Zero pelo novo ícone.</li></ol></section>
        <section className="min-w-0"><h3 className="flex items-center gap-2 font-semibold"><Share className="size-4" />Safari · iPhone e iPad</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground"><li>Abra o endereço do Zero no Safari.</li><li>Toque em Compartilhar e depois em “Adicionar à Tela de Início”.</li><li>Se aparecer “Abrir como App”, deixe ativado; toque em Adicionar.</li><li>Abra o Zero pelo ícone e permita os avisos em Conta.</li></ol></section>
        <p className="text-xs text-muted-foreground">No iPhone e iPad, os avisos com o app fechado exigem iOS/iPadOS 16.4 ou mais recente e abertura pela Tela de Início. A instalação não cria uma versão da App Store ou Play Store.</p>
      </DialogContent>
    </Dialog>
  </>;
}