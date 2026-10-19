import { z } from "zod";

export const TIME_LABELS = { work: "Trabalho", study: "Estudo", gaming: "Jogos", exercise: "Exercício", sleep: "Sono", rest: "Descanso", family: "Família e amigos", commute: "Deslocamento", other: "Outros" } as const;
export const timeCategory = z.enum(Object.keys(TIME_LABELS) as [keyof typeof TIME_LABELS, ...(keyof typeof TIME_LABELS)[]]);
export const startTimeSchema = z.object({ category: timeCategory });
export const DAY_MINUTES = 24 * 60;
export const logTimeSchema = z.object({
  category: timeCategory,
  minutes: z.number().int().min(1).max(DAY_MINUTES),
  dayStart: z.string().datetime(),
});
export type TimeSession = { id: string; category: keyof typeof TIME_LABELS; started_at: string; ended_at: string | null };

export function dailyTimeSummary(sessions: TimeSession[], date: string, now: Date) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const seconds = Object.fromEntries(Object.keys(TIME_LABELS).map(k => [k, 0])) as Record<keyof typeof TIME_LABELS, number>;
  for (const session of sessions) {
    if (!(session.category in seconds)) continue;
    const from = Math.max(start.getTime(), Date.parse(session.started_at));
    const to = Math.min(end.getTime(), session.ended_at ? Date.parse(session.ended_at) : now.getTime());
    if (to > from) seconds[session.category] += (to - from) / 1000;
  }
  const total = Object.values(seconds).reduce((a, b) => a + b, 0);
  const daySeconds = (end.getTime() - start.getTime()) / 1000;
  return {
    total,
    // percent = share of the time the user categorised; dayPercent = share of the 24h day
    entries: Object.entries(seconds).map(([category, value]) => ({ category: category as keyof typeof TIME_LABELS, seconds: value, percent: total ? value / total * 100 : 0, dayPercent: value / daySeconds * 100 })),
    untrackedPercent: Math.max(0, 100 - total / daySeconds * 100),
  };
}

export function durationLabel(seconds: number) {
  const m = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${m % 60}min` : ""}` : `${m}min`;
}
