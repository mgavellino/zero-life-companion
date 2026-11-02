import { automaticCategory } from "@/lib/bills";

export type ImportedTx = { kind: "income" | "expense"; amount: number; description: string; category: string; occurred_on: string };

const toNumber = (raw: string) => {
  let s = raw.replace(/[^\d,.-]/g, "");
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const toDate = (raw: string): string | null => {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`; }
  return null;
};

const make = (amount: number, description: string, date: string): ImportedTx | null => {
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100_000_000) return null;
  const desc = description.trim().replace(/\s+/g, " ").slice(0, 120) || "Extrato";
  return { kind: amount > 0 ? "income" : "expense", amount: Math.round(Math.abs(amount) * 100) / 100, description: desc, category: automaticCategory(desc), occurred_on: date };
};

/** Reads bank statements: OFX (STMTTRN blocks) or CSV with date, description and signed amount columns. */
export function parseStatement(text: string): { rows: ImportedTx[]; skipped: number } {
  const rows: ImportedTx[] = [];
  let skipped = 0;
  if (/<STMTTRN>/i.test(text)) {
    for (const block of text.split(/<STMTTRN>/i).slice(1)) {
      const tag = (n: string) => block.match(new RegExp(`<${n}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
      const date = toDate(tag("DTPOSTED"));
      const tx = date ? make(toNumber(tag("TRNAMT")), tag("MEMO") || tag("NAME"), date) : null;
      if (tx) rows.push(tx); else skipped++;
    }
    return { rows, skipped };
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sep = (lines[0]?.split(";").length ?? 0) > 1 ? ";" : ",";
  for (const line of lines) {
    const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
    const dateIdx = cols.findIndex((c) => toDate(c));
    if (dateIdx < 0) { skipped++; continue; }
    const amountIdx = cols.map((c, i) => [c, i] as const).reverse().find(([c, i]) => i !== dateIdx && /\d/.test(c) && /^[-+R$€\s\d.,]+$/.test(c))?.[1];
    const descIdx = cols.findIndex((c, i) => i !== dateIdx && i !== amountIdx && /[a-z]/i.test(c));
    const tx = amountIdx === undefined ? null : make(toNumber(cols[amountIdx]!), cols[descIdx] ?? "", toDate(cols[dateIdx]!)!);
    if (tx) rows.push(tx); else skipped++;
  }
  return { rows, skipped };
}

/** Finds the paid total on OCR text from a receipt: prefers lines labelled total/valor a pagar, else the largest amount. */
export function receiptTotal(text: string): number | null {
  const amounts = (line: string) => [...line.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})\b/g)].map((m) => toNumber(m[1]!)).filter((n) => n > 0);
  const lines = text.split(/\r?\n/);
  const labelled = lines.filter((l) => /total|a pagar|valor pago|amount due|importe|montant|summe|totale/i.test(l) && !/subtotal|troco|desconto/i.test(l));
  for (const l of labelled.reverse()) { const a = amounts(l); if (a.length) return a[a.length - 1]!; }
  const all = lines.flatMap(amounts);
  return all.length ? Math.max(...all) : null;
}

/** Consecutive-day streak ending today (or yesterday, so the streak survives until the day ends). */
export function streak(dates: string[], todayIso: string): number {
  const set = new Set(dates);
  const d = new Date(`${todayIso}T12:00:00Z`);
  if (!set.has(todayIso)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/** Months until a savings goal is reached at the given monthly saving; null when not saving. */
export function monthsToGoal(target: number, saved: number, monthly: number): number | null {
  const left = target - saved;
  if (left <= 0) return 0;
  if (!(monthly > 0)) return null;
  return Math.ceil(left / monthly);
}

/** Most frequent foods in recent meals, for a shopping list. */
export function shoppingList(mealNames: string[], limit = 12): { item: string; count: number }[] {
  const counts = new Map<string, { item: string; count: number }>();
  for (const name of mealNames) for (const raw of name.split(/,|\+| e | com | and | with /i)) {
    const item = raw.replace(/\d+\s*(g|kg|ml|l|un|unidades?|x)?\b/gi, "").replace(/\s+/g, " ").trim();
    if (item.length < 3) continue;
    const key = item.toLowerCase();
    const cur = counts.get(key) ?? { item: item.charAt(0).toUpperCase() + item.slice(1), count: 0 };
    cur.count++; counts.set(key, cur);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
