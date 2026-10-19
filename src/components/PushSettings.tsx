import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { getPushPublicKey, registerPushDevice, disablePushDevice, testPushDevice } from "@/lib/push.functions";

export function PushSettings() {
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const getKey = useServerFn(getPushPublicKey), register = useServerFn(registerPushDevice), remove = useServerFn(disablePushDevice), test = useServerFn(testPushDevice);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration("/").then(async reg => setEnabled(!!(await reg?.pushManager.getSubscription()))).catch(() => {}); }, []);
  async function enable() {
    if (window.top !== window.self) { setNote("Abra o Zero em uma nova aba para ativar os avisos."); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { setNote("Este navegador não suporta avisos com o app fechado. No iPhone, adicione o Zero à Tela de Início e abra por lá."); return; }
    setBusy(true);
    try {
      if (await Notification.requestPermission() !== "granted") { setNote("Permita notificações nas configurações deste site no navegador."); return; }
      const { publicKey } = await getKey();
      const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
      const key = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
      const reg = await navigator.serviceWorker.register("/zero-messaging-sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (sub && !enabled) { await sub.unsubscribe(); sub = null; }
      sub = sub ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await register({ data: sub.toJSON() });
      setEnabled(true); setNote("Avisos ativados neste aparelho. O texto na tela bloqueada não mostra seus dados pessoais."); toast.success("Avisos ativados");
    } catch { setNote("Não foi possível ativar agora. Tente no Zero publicado, aberto em sua própria aba."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try { const reg = await navigator.serviceWorker.getRegistration("/"); const sub = await reg?.pushManager.getSubscription(); if (sub) { await remove({data:{endpoint:sub.endpoint}}); await sub.unsubscribe(); } setEnabled(false); setNote("Avisos desativados neste aparelho."); }
    catch { toast.error("Não foi possível desativar agora."); } finally { setBusy(false); }
  }
  return <section className="mt-8 border-y py-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="size-5" />Avisos com o app fechado</h2><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={enabled ? disable : enable}>{enabled ? "Desativar neste aparelho" : "Ativar neste aparelho"}</Button>{enabled && <Button variant="outline" disabled={busy} onClick={async () => {setBusy(true); try {const reg = await navigator.serviceWorker.getRegistration("/"); const sub = await reg?.pushManager.getSubscription(); if(sub) { await test({data:{endpoint:sub.endpoint}}); toast.success("Aviso de teste enviado"); }} catch {toast.error("Não foi possível enviar o teste.");} finally {setBusy(false);}}}><Send className="size-4" />Testar aviso</Button>}</div>{note && <p role="status" className="mt-3 text-sm text-muted-foreground">{note}</p>}</section>;
}