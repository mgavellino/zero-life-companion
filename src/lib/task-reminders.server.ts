import system from "@/locales/system";

type Lang = keyof typeof system;
const LEAD_MINUTES = 10;

/** Creates one in-app notice per upcoming task (deduplicated by task + due time) so reminders work with the app closed. */
export async function generateTaskReminders() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const soon = new Date(now.getTime() + LEAD_MINUTES * 60_000);
  const { data: tasks, error } = await supabaseAdmin.from("tasks").select("id,user_id,title,due_at").eq("done", false).gte("due_at", now.toISOString()).lte("due_at", soon.toISOString()).limit(500);
  if (error) throw new Error("Falha ao gerar lembretes.");
  if (!tasks?.length) return 0;
  const userIds = [...new Set(tasks.map(t => t.user_id))];
  const { data: prefs } = await supabaseAdmin.from("user_preferences").select("user_id,language,timezone").in("user_id", userIds);
  const byUser = new Map((prefs ?? []).map(p => [p.user_id, p]));
  const rows = tasks.map(task => {
    const pref = byUser.get(task.user_id);
    const lang = (pref?.language && pref.language in system ? pref.language : "pt") as Lang;
    let at: string;
    try { at = new Date(task.due_at!).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: pref?.timezone || "America/Sao_Paulo" }); }
    catch { at = new Date(task.due_at!).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }); }
    const n = system[lang].notif;
    return { user_id: task.user_id, title: n.soon.replace("{{title}}", task.title), body: n.starts.replace("{{at}}", at), kind: "reminder", link: "/tempo", reminder_key: `task:${task.id}:${task.due_at}` };
  });
  const { data, error: insertError } = await supabaseAdmin.from("notifications").upsert(rows, { onConflict: "user_id,reminder_key", ignoreDuplicates: true }).select("id");
  if (insertError) { console.error("Task reminders failed", insertError.code); return 0; }
  return data?.length ?? 0;
}
