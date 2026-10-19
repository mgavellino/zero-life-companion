export type EnergyProfile = { weight_kg: number; height_cm: number; age: number; sex: "male" | "female" };
export const ACTIVITIES = {
  walk: { label: "Caminhada", met: 3.5 },
  run: { label: "Corrida", met: 8 },
  cycle: { label: "Bicicleta", met: 6.8 },
  swim: { label: "Natação", met: 6 },
  dance: { label: "Dança", met: 4.8 },
} as const;
export function basalCalories(p: EnergyProfile) {
  return Math.round(10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + (p.sex === "male" ? 5 : -161));
}
// Net activity expenditure avoids counting resting calories twice.
export function activityCalories(met: number, weight: number, minutes: number) {
  return Math.round(Math.max(0, met - 1) * 3.5 * weight / 200 * minutes);
}
export function dailyExpenditure(p: EnergyProfile, extraCalories: number) {
  return Math.round(basalCalories(p) * 1.2 + extraCalories);
}
export function monthlyProjection(income: number, expense: number, date: Date) {
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const factor = days / date.getDate();
  return { income: income * factor, expense: expense * factor, balance: (income - expense) * factor };
}
export function goalMonthlyRequired(target: number, saved: number, targetDate: string, now: string) {
  const end = new Date(`${targetDate}T12:00:00`), start = new Date(`${now}T12:00:00`);
  const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (86400000 * 30.4375)));
  return Math.max(0, target - saved) / months;
}
export function habitsForDay<T extends { habit_id: string; checked_on: string }>(checks: T[], date: string) {
  return checks.filter(c => c.checked_on === date);
}