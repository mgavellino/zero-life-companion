import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type N = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; link: string | null };

/** Floating panel that opens once each time the app is opened, listing every unread notification. */
export function NotificationPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [], isSuccess } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,title,body,created_at,read_at,link").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as N[];
    },
  });
  const unread = data.filter((n) => !n.read_at);

  useEffect(() => {
    if (!isSuccess || sessionStorage.getItem("zero-notif-panel")) return;
    sessionStorage.setItem("zero-notif-panel", "1");
    if (unread.length) setOpen(true);
  }, [isSuccess, unread.length]);

  async function close(markRead: boolean) {
    setOpen(false);
    if (!markRead) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-x-3 top-16 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-top-4 rounded-3xl border bg-popover text-popover-foreground shadow-2xl" role="dialog" aria-label={t("fx.notifTitle")}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Bell className="size-4 text-signal" />
        <p className="flex-1 font-display font-semibold">{t("fx.notifTitle")} <span className="text-muted-foreground">· {unread.length}</span></p>
        <Button variant="ghost" size="icon" aria-label={t("fx.notifClose")} onClick={() => close(false)}><X className="size-4" /></Button>
      </div>
      <div className="max-h-[55vh] overflow-y-auto">
        {unread.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("fx.notifEmpty")}</p>}
        {unread.map((n) => {
          const inner = <><p className="text-sm font-medium">{n.title}</p>{n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}<p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></>;
          return n.link?.startsWith("/")
            ? <Link key={n.id} to={n.link} onClick={() => setOpen(false)} className="block border-b px-4 py-3 last:border-0 hover:bg-accent">{inner}</Link>
            : <div key={n.id} className="border-b px-4 py-3 last:border-0">{inner}</div>;
        })}
      </div>
      <div className="border-t p-3"><Button className="w-full gap-2" onClick={() => close(true)}><Check className="size-4" /> {t("fx.notifAll")}</Button></div>
    </div>
  );
}
