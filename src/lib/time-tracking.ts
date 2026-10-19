import { z } from "zod";

export const timeCategory = z.enum(["work", "gaming", "study", "rest", "other"]);
export const startTimeSchema = z.object({ category: timeCategory });
export const TIME_LABELS = { work: "Trabalho", gaming: "Jogos", study: "Estudo", rest: "Descanso", other: "Outros" } as const;
export type TimeSession = { id: string; category: keyof typeof TIME_LABELS; started_at: string; ended_at: string | null };

export function dailyTimeSummary(sessions: TimeSession[], date: string, now: Date) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const cutoff = Math.min(end.getTime(), now.getTime());
  const seconds = Object.fromEntries(Object.keys(TIME_LABELS).map(k => [k, 0])) as Record<keyof typeof TIME_LABELS, number>;
  for (const session of sessions) {
    const from = Math.max(start.getTime(), Date.parse(session.started_at));
    const to = Math.min(cutoff, session.ended_at ? Date.parse(session.ended_at) : now.getTime());
    if (to > from) seconds[session.category] += (to - from) / 1000;
  }
  const total = Object.values(seconds).reduce((a, b) => a + b, 0);
  const daySeconds = (end.getTime() - start.getTime()) / 1000;
  return { total, entries: Object.entries(seconds).map(([category, value]) => ({ category: category as keyof typeof TIME_LABELS, seconds: value, percent: value / daySeconds * 100 })), untrackedPercent: Math.max(0, 100 - total / daySeconds * 100) };
}

export function durationLabel(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}