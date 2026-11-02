import { describe, expect, it } from "vitest";
import { monthsToGoal, parseStatement, receiptTotal, shoppingList, streak } from "./money-import";
import { parseQuickIntent } from "./quick-intent";

describe("statement import", () => {
  it("reads OFX", () => {
    const r = parseStatement("<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261030<TRNAMT>-45.90<MEMO>UBER TRIP</STMTTRN><STMTTRN><DTPOSTED>20261031<TRNAMT>3000.00<MEMO>SALARIO</STMTTRN>");
    expect(r.rows).toEqual([
      expect.objectContaining({ kind: "expense", amount: 45.9, occurred_on: "2026-10-30" }),
      expect.objectContaining({ kind: "income", amount: 3000, occurred_on: "2026-10-31" }),
    ]);
  });
  it("reads Brazilian CSV and skips header", () => {
    const r = parseStatement("Data;Descrição;Valor\n30/10/2026;Mercado Extra;-1.234,56\n");
    expect(r.rows[0]).toMatchObject({ kind: "expense", amount: 1234.56, occurred_on: "2026-10-30" });
    expect(r.skipped).toBe(1);
  });
});

describe("receipt", () => {
  it("prefers the TOTAL line over larger numbers", () => {
    expect(receiptTotal("CNPJ 12.345\nDINHEIRO 100,00\nTOTAL R$ 48,90\nTROCO 51,10")).toBe(48.9);
  });
});

describe("streaks, goals, shopping", () => {
  it("counts consecutive days", () => {
    expect(streak(["2026-11-01", "2026-10-31", "2026-10-30", "2026-10-28"], "2026-11-01")).toBe(3);
    expect(streak(["2026-10-31"], "2026-11-01")).toBe(1);
  });
  it("forecasts goal months", () => {
    expect(monthsToGoal(1000, 400, 200)).toBe(3);
    expect(monthsToGoal(1000, 400, 0)).toBeNull();
  });
  it("ranks foods", () => {
    expect(shoppingList(["200g frango com arroz", "frango e salada"])[0]).toEqual({ item: "Frango", count: 2 });
  });
});

describe("split bill", () => {
  it("rachei 120 com 3 amigos → my share of 4", () => {
    expect(parseQuickIntent("rachei 120 com 3 amigos")).toMatchObject({ type: "transaction", kind: "expense", amount: 30 });
  });
  it("dividi 90 entre 3", () => {
    expect(parseQuickIntent("dividi 90 entre 3")).toMatchObject({ amount: 30 });
  });
});
