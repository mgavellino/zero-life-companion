import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { getPushPublicKey, registerPushDevice, disablePushDevice, testPushDevice } from "@/lib/push.functions";

function decodeKey(publicKey: string) {
  const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
  const key = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
  return key;
}
function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

export function PushSettings() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const getKey = useServerFn(getPushPublicKey), register = useServerFn(registerPushDevice), remove = useServerFn(disablePushDevice), test = useServerFn(testPushDevice);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration("/").then(async reg => setEnabled(!!(await reg?.pushManager?.getSubscription()))).catch(() => {}); }, []);

  /** Ensures this device has a subscription signed with the current server key and that the server knows it. */
  async function ensureSubscription(forceNew = false) {
    const { publicKey } = await getKey();
    const key = decodeKey(publicKey);
    const reg = await navigator.serviceWorker.register("/zero-messaging-sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && (forceNew || !sameKey(sub.options.applicationServerKey, key))) { await sub.unsubscribe(); sub = null; }
    sub = sub ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await register({ data: sub.toJSON() });
    return sub;
  }

  async function enable() {
    if (window.top !== window.self) { setNote(t("push.newTab")); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) { setNote(t("push.unsupported")); return; }
    setBusy(true);
    try {
      if (await Notification.requestPermission() !== "granted") { setNote(t("push.permission")); return; }
      await ensureSubscription();
      setEnabled(true); setNote(t("push.enabledNote")); toast.success(t("push.enabled"));
    } catch { setNote(t("push.enableError")); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try { const reg = await navigator.serviceWorker.getRegistration("/"); const sub = await reg?.pushManager.getSubscription(); if (sub) { await remove({ data: { endpoint: sub.endpoint } }); await sub.unsubscribe(); } setEnabled(false); setNote(t("push.disabled")); }
    catch { toast.error(t("push.disableError")); } finally { setBusy(false); }
  }
  async function sendTest() {
    setBusy(true);
    try {
      if (Notification.permission !== "granted") { setNote(t("push.permission")); return; }
      try { const sub = await ensureSubscription(); await test({ data: { endpoint: sub.endpoint } }); }
      catch { const sub = await ensureSubscription(true); await test({ data: { endpoint: sub.endpoint } }); }
      toast.success(t("push.testSent"));
    } catch { toast.error(t("push.testError")); }
    finally { setBusy(false); }
  }
  return <section className="mt-8 border-y py-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="size-5" />{t("push.title")}</h2><div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={enabled ? disable : enable}>{enabled ? t("push.disable") : t("push.enable")}</Button>{enabled && <Button variant="outline" disabled={busy} onClick={sendTest}><Send className="size-4" />{t("push.test")}</Button>}</div>{note && <p role="status" className="mt-3 text-sm text-muted-foreground">{note}</p>}</section>;
}
