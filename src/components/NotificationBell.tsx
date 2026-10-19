import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type N = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; link: string | null };

function browserNotify(title: string, body?: string | null) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body: body ?? "", icon: "/favicon.png" });
  } catch {
    /* some mobile browsers only allow notifications via a service worker */
  }
}

/** Creates a notification for tasks that start within the next 10 minutes (once per task). */
function useTaskReminders(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 10 * 60_000);
      const { data } = await supabase.from("tasks").select("id,title,due_at").eq("done", false).gte("due_at", now.toISOString()).lte("due_at", soon.toISOString());
      const sent: string[] = JSON.parse(localStorage.getItem("zero-reminded") ?? "[]");
      for (const tk of data ?? []) {
        if (sent.includes(tk.id)) continue;
        sent.push(tk.id);
        const at = new Date(tk.due_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        await supabase.from("notifications").insert({ user_id: userId, title: `Daqui a pouco: ${tk.title}`, body: `Começa às ${at}.`, kind: "reminder", link: "/tempo" });
      }
      localStorage.setItem("zero-reminded", JSON.stringify(sent.slice(-200)));
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [userId]);
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string>();
  const [perm, setPerm] = useState<string>("default");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);
  useTaskReminders(userId);

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,title,body,created_at,read_at,link").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as N[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("notif-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        const n = p.new as N;
        toast(n.title, { description: n.body ?? undefined });
        browserNotify(n.title, n.body);
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const unread = data.filter((n) => !n.read_at).length;

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function enablePush() {
    if (typeof Notification === "undefined") { toast.error("Seu navegador não suporta notificações."); return; }
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") browserNotify("Notificações ativadas", "O Zero vai te avisar na hora certa.");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          {unread ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-signal text-[10px] font-bold text-signal-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-display text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Check className="size-3" /> Marcar lidas
            </button>
          )}
        </div>
        {perm !== "granted" && (
          <button onClick={enablePush} className="w-full border-b bg-muted px-4 py-2 text-left text-xs hover:bg-accent">
            Ativar avisos no navegador →
          </button>
        )}
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>}
          {data.map((n) => (
            <div key={n.id} className={`border-b px-4 py-3 last:border-0 ${n.read_at ? "opacity-60" : ""}`}>
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
