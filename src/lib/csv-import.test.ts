import { describe, expect, it } from "vitest";
import { parseExercisesCsv, parseFoodsCsv } from "./csv-import";

describe("csv import", () => {
  it("parses foods with header, semicolon and decimal comma", () => {
    const r = parseFoodsCsv("nome;kcal;prot;carb;gord;unid\nTapioca;240;0,5;60;0;\nRuim;abc;1;1;1;");
    expect(r.rows).toEqual([{ name: "Tapioca", kcal_100g: 240, protein_100g: 0.5, carbs_100g: 60, fat_100g: 0, unit_grams: null }]);
    expect(r.skipped).toBe(1);
  });
  it("rejects foods above 950 kcal per 100 g", () => {
    expect(parseFoodsCsv("X,1000,1,1,1").rows).toHaveLength(0);
  });
  it("parses exercises and rejects zero kcal/h", () => {
    const r = parseExercisesCsv("Beach tennis,520\nNada,0");
    expect(r.rows).toEqual([{ name: "Beach tennis", kcal_per_hour: 520 }]);
    expect(r.skipped).toBe(1);
  });
});
