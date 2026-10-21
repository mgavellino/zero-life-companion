import { describe, expect, it } from "vitest";
import { activityCalories, parseQuickIntent } from "./quick-intent";

// 2026-10-20 22:00 in São Paulo
const now = new Date("2026-10-21T01:00:00Z");
const p = (s: string) => parseQuickIntent(s, now, "America/Sao_Paulo");

describe("parseQuickIntent", () => {
  it("expense with place", () => expect(p("gastei 30 no mercado")).toEqual({ type: "transaction", kind: "expense", amount: 30, description: "Mercado" }));
  it("expense with R$ and cents", () => expect(p("paguei R$ 45,90 de uber")).toMatchObject({ kind: "expense", amount: 45.9, description: "Uber" }));
  it("income", () => expect(p("recebi 2500 de salário")).toMatchObject({ kind: "income", amount: 2500 }));
  it("relative reminder", () => expect(p("me lembra de beber água daqui a 10 minutos")).toEqual({ type: "task", title: "Beber água", due_local: null, minutes_from_now: 10 }));
  it("tomorrow at 9h", () => expect(p("me lembra de pagar a luz amanhã às 9h")).toMatchObject({ title: "Pagar a luz", due_local: "2026-10-21T09:00" }));
  it("time already passed today goes to tomorrow", () => expect(p("me lembra de ligar pro joão às 8h")).toMatchObject({ due_local: "2026-10-21T08:00" }));
  it("meal from food table", () => expect(p("comi 150g de arroz e 100g de frango")).toMatchObject({ type: "meal", calories: 351, meal_type: "jantar" }));
  it("unknown food falls back to AI", () => expect(p("comi um acarajé")).toBeNull());
  it("activity", () => expect(p("corri 30 minutos")).toMatchObject({ type: "activity", activity: "Corrida", minutes: 30 }));
  it("future activity is ignored", () => expect(p("vou correr 30 minutos")).toBeNull());
  it("questions go to AI", () => expect(p("quanto gastei 30 dias?")).toBeNull());
  it("chit-chat goes to AI", () => expect(p("oi, tudo bem")).toBeNull());
  it("activity kcal uses weight", () => expect(activityCalories(9.8, 30, 80).calories).toBe(352));
});
