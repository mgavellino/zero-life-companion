// Browser-safe CSV parsing for bulk custom foods / exercises (no AI).
export type FoodRow = { name: string; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; unit_grams: number | null };
export type ExerciseRow = { name: string; kcal_per_hour: number };
export type Parsed<T> = { rows: T[]; skipped: number };

const num = (v: string | undefined) => (v === undefined || v.trim() === "" ? NaN : Number(v.trim().replace(",", ".")));

function splitLines(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "";
  const sep = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  return lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, "$1")));
}

const isHeader = (cells: string[]) => cells.length > 1 && Number.isNaN(num(cells[1]));

export function parseFoodsCsv(text: string, max = 500): Parsed<FoodRow> {
  const rows: FoodRow[] = []; let skipped = 0;
  splitLines(text).forEach((c, i) => {
    if (i === 0 && isHeader(c)) return;
    const [name, k, p, cb, f, u] = c;
    const kcal = num(k), pr = num(p || "0"), ca = num(cb || "0"), fa = num(f || "0"), unit = u && u.trim() ? num(u) : null;
    const ok = name && kcal >= 0 && kcal <= 950 && [pr, ca, fa].every((x) => x >= 0 && x <= 100) && (unit === null || (unit > 0 && unit <= 5000));
    if (!ok || rows.length >= max) { skipped++; return; }
    rows.push({ name: name.slice(0, 80), kcal_100g: kcal, protein_100g: pr, carbs_100g: ca, fat_100g: fa, unit_grams: unit });
  });
  return { rows, skipped };
}

export function parseExercisesCsv(text: string, max = 500): Parsed<ExerciseRow> {
  const rows: ExerciseRow[] = []; let skipped = 0;
  splitLines(text).forEach((c, i) => {
    if (i === 0 && isHeader(c)) return;
    const [name, k] = c; const kcal = num(k);
    if (!name || !(kcal > 0 && kcal <= 3000) || rows.length >= max) { skipped++; return; }
    rows.push({ name: name.slice(0, 80), kcal_per_hour: kcal });
  });
  return { rows, skipped };
}
