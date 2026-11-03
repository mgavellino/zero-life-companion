import features from "@/locales/features";
import { localNow, localToUtcIso, validTz } from "@/lib/tz";

type Lang = keyof typeof features;
const SUMMARY_HOUR = 21;

/** At 21:00 local time, one notice per user summarising today's records (skipped when nothing was logged). Deduplicated by reminder_key. */
export async function generateDailySummaries(now = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prefs } = await supabaseAdmin.from("user_preferences").select("user_id,language,timezone,currency").limit(5000);
  const due = (prefs ?? []).flatMap((p) => {
    const tz = validTz(p.timezone) ?? "America/Sao_Paulo";
    const local = localNow(tz, now);
    return Number(local.slice(11, 13)) === SUMMARY_HOUR ? [{ ...p, tz, date: local.slice(0, 10) }] : [];
  });
  if (!due.length) return 0;
  const keys = due.map((p) => `summary:${p.date}`);
  const { data: existing } = await supabaseAdmin.from("notifications").select("user_id,reminder_key").in("user_id", due.map((p) => p.user_id)).in("reminder_key", keys);
  const sent = new Set((existing ?? []).map((e) => `${e.user_id}:${e.reminder_key}`));
  const rows = [];
  for (const p of due.filter((p) => !sent.has(`${p.user_id}:summary:${p.date}`)).slice(0, 200)) {
    const start = localToUtcIso(`${p.date}T00:00`, p.tz)!;
    const end = new Date(new Date(start).getTime() + 864e5).toISOString();
    const [tx, meals, time] = await Promise.all([
      supabaseAdmin.from("transactions").select("amount").eq("user_id", p.user_id).eq("kind", "expense").eq("occurred_on", p.date),
      supabaseAdmin.from("meals").select("calories").eq("user_id", p.user_id).eq("eaten_on", p.date),
      supabaseAdmin.from("time_sessions").select("started_at,ended_at").eq("user_id", p.user_id).gte("started_at", start).lt("started_at", end),
    ]);
    const spent = (tx.data ?? []).reduce((a, x) => a + Number(x.amount), 0);
    const kcal = (meals.data ?? []).reduce((a, x) => a + Number(x.calories), 0);
    const hours = (time.data ?? []).reduce((a, x) => a + (x.ended_at ? new Date(x.ended_at).getTime() - new Date(x.started_at).getTime() : 0), 0) / 36e5;
    if (!tx.data?.length && !meals.data?.length && !time.data?.length) continue;
    const lang = (p.language in features ? p.language : "pt") as Lang;
    const f = features[lang].fx;
    let spentText: string;
    try { spentText = new Intl.NumberFormat(lang === "pt" ? "pt-BR" : lang, { style: "currency", currency: p.currency || "BRL" }).format(spent); } catch { spentText = spent.toFixed(2); }
    rows.push({
      user_id: p.user_id, kind: "reminder", link: "/dashboard", reminder_key: `summary:${p.date}`,
      title: f.summaryTitle,
      body: f.summaryBody.replace("{{spent}}", spentText).replace("{{kcal}}", String(Math.round(kcal))).replace("{{hours}}", hours.toFixed(1)),
    });
  }
  if (!rows.length) return 0;
  const { data, error } = await supabaseAdmin.from("notifications").upsert(rows, { onConflict: "user_id,reminder_key", ignoreDuplicates: true }).select("id");
  if (error) { console.error("Daily summary failed", error.code); return 0; }
  return data?.length ?? 0;
}
