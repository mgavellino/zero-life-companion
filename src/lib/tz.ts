/** Timezone helpers shared by the assistant: the model speaks user-local time, the database stores UTC. */
export function validTz(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz) return null;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return null; }
}
function offsetMinutes(at: Date, tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}
/** "YYYY-MM-DD HH:mm" in the user's timezone → UTC ISO. Strings with an explicit offset or Z are kept as given. */
export function localToUtcIso(value: string, tz: string): string | null {
  const v = value.trim();
  if (/(z|[+-]\d{2}:?\d{2})$/i.test(v)) { const d = new Date(v); return isNaN(+d) ? null : d.toISOString(); }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) { const d = new Date(v); return isNaN(+d) ? null : d.toISOString(); }
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0));
  const first = guess - offsetMinutes(new Date(guess), tz) * 60000;
  return new Date(guess - offsetMinutes(new Date(first), tz) * 60000).toISOString();
}
export function localNow(tz: string, now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "long" }).format(now);
}
