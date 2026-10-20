import { describe, expect, it } from "vitest";
import { confirmActions } from "./chat-confirmations";

describe("instant action confirmations", () => {
  it("confirms a saved expense with amount and category", () => {
    const text = confirmActions([{ toolName: "add_transaction", output: { ok: true, transaction: { kind: "expense", amount: 25, category: "alimentação", description: "almoço" } } }], { lang: "pt", currency: "BRL" });
    expect(text).toContain("Despesa registrada");
    expect(text).toContain("25,00");
    expect(text).toContain("alimentação");
  });
  it("confirms a scheduled task in the user's timezone", () => {
    const text = confirmActions([{ toolName: "add_task", output: { ok: true, task: "Dentista", due_at: "2026-10-20T17:00:00.000Z" } }], { lang: "pt", tz: "America/Sao_Paulo" });
    expect(text).toContain("Dentista");
    expect(text).toContain("14:00");
  });
  it("confirms a meal with calories", () => {
    const text = confirmActions([{ toolName: "add_meal", output: { ok: true, name: "Arroz e frango", calories: 520.4, protein: 40, carbs: 60, fat: 10 } }], { lang: "pt" });
    expect(text).toContain("520 kcal");
  });
  it("reports a failed save instead of claiming success", () => {
    const text = confirmActions([{ toolName: "add_task", output: { ok: false } }], { lang: "pt" });
    expect(text).not.toContain("✅");
    expect(text).toContain("Não consegui salvar");
  });
});
