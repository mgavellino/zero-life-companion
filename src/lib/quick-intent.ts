/**
 * Rule-based understanding of everyday chat commands (expenses, income, reminders, meals, exercise).
 * Runs before the AI: when a message is recognised it is saved instantly with no model call.
 * Returns null whenever unsure so the AI handles it.
 */
export type QuickIntent =
  | { type: "transaction"; kind: "income" | "expense"; amount: number; description: string }
  | { type: "task"; title: string; due_local: string | null; minutes_from_now: number | null }
  | { type: "meal"; name: string; meal_type: "cafe" | "almoco" | "lanche" | "jantar"; calories: number; protein: number; carbs: number; fat: number }
  | { type: "activity"; activity: string; minutes: number; met: number };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const QUESTION = /\?|^(quanto|qual|quais|como|onde|porque|por que|devo|posso|sera|what|how|which|should|cuanto|cual)\b/;
const NUM_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, meia: 0.5, meio: 0.5, a: 1, an: 1, one: 1, two: 2, three: 3, un: 1, una: 1, dos: 2 };
const num = (s: string) => { const n = Number(s.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NUM_WORDS[s] ?? NaN; };
const pad = (n: number) => String(n).padStart(2, "0");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
let original = new Map<string, string>();
/** Puts the user's accents back on words that were normalised for matching. */
const restore = (s: string) => s.split(" ").map((w) => original.get(w) ?? w).join(" ");

// ---------- money ----------
const EXPENSE = /\b(gastei|paguei|comprei|torrei|spent|paid|bought|gaste|pague|compre)\b/;
const INCOME = /\b(recebi|ganhei|entrou|caiu|received|earned|got paid|recibi|gane)\b/;
const AMOUNT = /(?:r\$|\$|€|us\$)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k|mil|reais|real|conto|contos|pila|dolares|dollars|euros|bucks)?\b/;

function parseMoney(t: string): QuickIntent | null {
  const kind = EXPENSE.test(t) ? "expense" : INCOME.test(t) ? "income" : null;
  if (!kind) return null;
  const m = t.match(AMOUNT);
  if (!m?.[1]) return null;
  let amount = num(m[1]);
  if (m[2] === "k" || m[2] === "mil") amount *= 1000;
  if (!(amount > 0) || amount > 100_000_000) return null;
  const rest = t.replace(m[0], " ").replace(kind === "expense" ? EXPENSE : INCOME, " ").replace(/\b(hoje|agora|reais|today)\b/g, " ");
  const d = rest.match(/\b(?:no|na|nos|nas|em|de|do|da|com|pro|pra|para|on|at|for|en|por)\s+(.+)$/);
  const description = cap((d?.[1] ?? rest).replace(/^(o|a|os|as|um|uma|the)\s+/, "").replace(/\s+/g, " ").trim()).slice(0, 120);
  return { type: "transaction", kind, amount: Math.round(amount * 100) / 100, description: restore(description) || (kind === "income" ? "Receita" : "Despesa") };
}

// ---------- reminders / tasks ----------
const TASK = /^(?:zero[, ]+)?(?:me\s+)?(?:lembra(?:r)?|lembre|avisa(?:r)?|avise|agenda(?:r)?|marca(?:r)?|remind me|recuerdame|avisame)(?:\s+(?:de|que|para|pra|me|to|about))*\s+/;
const REL = /\b(?:daqui a|daqui|em|in|en)\s+(\d+|um|uma|meia|dois|duas|an|a)\s*(min|minuto|minutos|minutes?|h|hora|horas|hours?|horas)\b/;
const TIME = /\b(?:as|a|at|ao|al|las|la)?\s*(\d{1,2})(?:(?:h|:)(\d{2})?|\s*(?:horas?|hrs?|pm|am))\b(?:\s*(?:da|de)\s*(manha|tarde|noite))?/;
const DAY = /\b(depois de amanha|amanha|hoje|tomorrow|today|manana|hoy)\b|\bdia\s+(\d{1,2})\b/;

export function localParts(now: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map((x) => [x.type, x.value]));
  return { y: +p.year!, mo: +p.month!, d: +p.day!, h: +p.hour!, mi: +p.minute! };
}

function parseTask(t: string, now: Date, tz: string): QuickIntent | null {
  const head = t.match(TASK);
  if (!head) return null;
  let body = t.slice(head[0].length);
  const rel = body.match(REL);
  if (rel?.[1] && rel[2]) {
    const n = num(rel[1]);
    const minutes = Math.round(/^h/.test(rel[2]) ? n * 60 : n);
    body = body.replace(rel[0], " ");
    const title = cap(restore(body.replace(/\s+/g, " ").trim()));
    if (!title || !(minutes >= 1)) return null;
    return { type: "task", title, due_local: null, minutes_from_now: minutes };
  }
  const l = localParts(now, tz);
  let date = new Date(Date.UTC(l.y, l.mo - 1, l.d));
  let explicitDay = false;
  const day = body.match(DAY);
  if (day) {
    explicitDay = true;
    if (day[2]) { const n = +day[2]; date = new Date(Date.UTC(l.y, l.mo - 1, n)); if (n < l.d) date = new Date(Date.UTC(l.y, l.mo, n)); }
    else if (day[1] === "depois de amanha") date.setUTCDate(date.getUTCDate() + 2);
    else if (/amanha|tomorrow|manana/.test(day[1]!)) date.setUTCDate(date.getUTCDate() + 1);
    body = body.replace(day[0], " ");
  }
  const time = body.match(TIME);
  let due: string | null = null;
  if (time?.[1]) {
    let h = +time[1]; const mi = time[2] ? +time[2] : 0;
    if ((time[3] === "tarde" || time[3] === "noite" || / pm/.test(time[0])) && h < 12) h += 12;
    if (h > 23 || mi > 59) return null;
    if (!explicitDay && (h < l.h || (h === l.h && mi <= l.mi))) date.setUTCDate(date.getUTCDate() + 1);
    due = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(h)}:${pad(mi)}`;
    body = body.replace(time[0], " ");
  } else if (explicitDay) {
    due = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T09:00`;
  }
  const title = cap(restore(body.replace(/\b(de|que|para|pra|to)\s*$/, "").replace(/^\s*(de|que|para|pra|to)\b/, "").replace(/\s+/g, " ").trim())).slice(0, 200);
  if (!title) return null;
  return { type: "task", title, due_local: due, minutes_from_now: null };
}

// ---------- meals ----------
// Per 100 g (or per unit when `unit` is set): kcal, protein, carbs, fat. Values from TACO/USDA averages.
type Food = { k: number; p: number; c: number; f: number; unit?: number };
const FOODS: [RegExp, Food][] = [
  [/arroz integral/, { k: 124, p: 2.6, c: 25.8, f: 1 }],
  [/arroz/, { k: 128, p: 2.5, c: 28.1, f: 0.2 }],
  [/feijao/, { k: 76, p: 4.8, c: 13.6, f: 0.5 }],
  [/frango|peito de frango/, { k: 159, p: 32, c: 0, f: 2.5 }],
  [/carne|bife|patinho|alcatra/, { k: 219, p: 32, c: 0, f: 9 }],
  [/carne moida/, { k: 212, p: 26.7, c: 0, f: 10.9 }],
  [/peixe|tilapia/, { k: 128, p: 26, c: 0, f: 2.7 }],
  [/salmao/, { k: 208, p: 20, c: 0, f: 13 }],
  [/ovos?\b/, { k: 143, p: 13, c: 1.1, f: 9.5, unit: 50 }],
  [/pao frances|pao(zinho)?\b/, { k: 300, p: 8, c: 58.6, f: 3.1, unit: 50 }],
  [/pao integral/, { k: 253, p: 9.4, c: 49.9, f: 3.7, unit: 25 }],
  [/macarrao|massa|espaguete/, { k: 158, p: 5.8, c: 30.9, f: 0.9 }],
  [/batata doce/, { k: 77, p: 0.6, c: 18.4, f: 0.1 }],
  [/batata frita/, { k: 312, p: 3.4, c: 41, f: 15 }],
  [/batata/, { k: 52, p: 1.2, c: 11.9, f: 0 }],
  [/mandioca|aipim|macaxeira/, { k: 125, p: 0.6, c: 30.1, f: 0.3 }],
  [/banana/, { k: 98, p: 1.3, c: 26, f: 0.1, unit: 100 }],
  [/maca\b|maca(s)?\b/, { k: 56, p: 0.3, c: 15.2, f: 0, unit: 130 }],
  [/laranja/, { k: 47, p: 0.9, c: 11.5, f: 0.1, unit: 150 }],
  [/mamao/, { k: 40, p: 0.5, c: 10.4, f: 0.1 }],
  [/abacate/, { k: 96, p: 1.2, c: 6, f: 8.4 }],
  [/aveia/, { k: 394, p: 13.9, c: 66.6, f: 8.5 }],
  [/leite/, { k: 61, p: 3.2, c: 4.7, f: 3.3 }],
  [/iogurte/, { k: 72, p: 4, c: 6, f: 3.5, unit: 170 }],
  [/queijo/, { k: 330, p: 22, c: 3, f: 25 }],
  [/presunto/, { k: 94, p: 14, c: 2, f: 2.7 }],
  [/whey/, { k: 400, p: 80, c: 8, f: 6, unit: 30 }],
  [/tapioca/, { k: 240, p: 0, c: 60, f: 0, unit: 70 }],
  [/cuscuz/, { k: 113, p: 2.2, c: 25.3, f: 0.7 }],
  [/salada|alface|tomate/, { k: 18, p: 1, c: 3.5, f: 0.2 }],
  [/brocolis/, { k: 25, p: 2.1, c: 4.4, f: 0.5 }],
  [/pizza/, { k: 266, p: 11, c: 33, f: 10, unit: 110 }],
  [/hamburguer|x-?burguer|lanche/, { k: 295, p: 17, c: 24, f: 14, unit: 200 }],
  [/chocolate/, { k: 540, p: 7.2, c: 59.6, f: 30.3 }],
  [/cafe\b/, { k: 2, p: 0.1, c: 0, f: 0, unit: 100 }],
  [/refrigerante|coca/, { k: 42, p: 0, c: 10.6, f: 0, unit: 350 }],
  [/cerveja/, { k: 43, p: 0.5, c: 3.6, f: 0, unit: 350 }],
  [/pasta de amendoim|amendoim/, { k: 588, p: 25, c: 20, f: 50 }],
];
const MEAL = /^(?:hoje\s+)?(?:eu\s+)?(?:comi|almocei|jantei|lanchei|tomei|bebi|ate|i ate|i had|comi?)\b|^(?:no |de )?(cafe da manha|almoco|jantar|lanche)\s*[:,-]?/;
const QTY = /(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|meia|meio)\s*(kg|g|gr|gramas?|ml|l|litros?|xicaras?|colher(?:es)?|fatias?|unidades?|copos?|pratos?|conchas?)?\s*(?:de\s+)?/;

function parseMeal(t: string, hour: number): QuickIntent | null {
  const head = t.match(MEAL);
  if (!head) return null;
  const word = t.match(/\b(cafe da manha|almoco|almocei|jantar|jantei|lanche|lanchei)\b/)?.[1] ?? "";
  const meal_type = /almo/.test(word) ? "almoco" : /jant/.test(word) ? "jantar" : /lanch/.test(word) ? "lanche" : /cafe da manha/.test(word) ? "cafe" : hour < 10 ? "cafe" : hour < 15 ? "almoco" : hour < 18 ? "lanche" : "jantar";
  const body = t.slice(head[0].length).replace(/\b(no|de|do)\s+(cafe da manha|almoco|jantar|lanche)\b/, " ");
  const items = body.split(/,|\be\b|\bcom\b|\+|\band\b|\bwith\b/).map((s) => s.trim()).filter(Boolean);
  if (!items.length) return null;
  const tot = { k: 0, p: 0, c: 0, f: 0 };
  const names: string[] = [];
  for (const item of items) {
    const food = FOODS.find(([re]) => re.test(item));
    if (!food) return null; // unknown food: let the AI estimate
    const [re, v] = food;
    const q = item.match(QTY);
    const n = q?.[1] ? num(q[1]) : 1;
    const u = q?.[2] ?? "";
    let grams: number;
    if (/^(g|gr|grama)/.test(u) || u === "ml") grams = n;
    else if (u === "kg" || /^(l|litro)/.test(u)) grams = n * 1000;
    else if (/^(xicara|copo)/.test(u)) grams = n * 200;
    else if (/^colher/.test(u)) grams = n * 15;
    else if (/^concha/.test(u)) grams = n * 140;
    else if (/^prato/.test(u)) grams = n * 300;
    else if (/^fatia/.test(u)) grams = n * (v.unit ?? 30);
    else grams = n * (v.unit ?? (q?.[1] ? 100 : 150)); // "arroz" alone = a typical 150 g serving
    if (!(grams > 0) || grams > 5000) return null;
    const r = grams / 100;
    tot.k += v.k * r; tot.p += v.p * r; tot.c += v.c * r; tot.f += v.f * r;
    names.push(item);
  }
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return { type: "meal", name: cap(restore(names.join(", "))).slice(0, 120), meal_type, calories: Math.round(tot.k), protein: r1(tot.p), carbs: r1(tot.c), fat: r1(tot.f) };
}

// ---------- exercise ----------
const ACTIVITIES: [RegExp, string, number][] = [
  [/\b(corri|correr|corrida|ran|running|corri)\b/, "Corrida", 9.8],
  [/\b(caminhei|caminhada|andei|walked|walking|camine)\b/, "Caminhada", 3.5],
  [/\b(pedalei|bike|bicicleta|ciclismo|cycled|cycling)\b/, "Bicicleta", 7.5],
  [/\b(nadei|natacao|swam|swimming|nade)\b/, "Natação", 7],
  [/\b(musculacao|malhei|treinei|academia|weights|gym|lifted)\b/, "Musculação", 5],
  [/\b(futebol|soccer|bola|pelada)\b/, "Futebol", 7],
  [/\b(dancei|danca|danced)\b/, "Dança", 5],
  [/\b(yoga|ioga|alonguei|alongamento)\b/, "Yoga/alongamento", 2.5],
  [/\b(crossfit|hiit|funcional)\b/, "Treino intenso", 8],
  [/\b(pulei corda|corda)\b/, "Pular corda", 11],
];
const DURATION = /(\d+(?:[.,]\d+)?|uma|um|meia|duas|dois|an|one)\s*(h|hr|hrs|hora|horas|hours?|min|mins|minuto|minutos|minutes?)\b/;

function parseActivity(t: string): QuickIntent | null {
  if (/\b(vou|amanha|quero|pretendo|will|going to|plan)\b/.test(t)) return null;
  const a = ACTIVITIES.find(([re]) => re.test(t));
  const d = t.match(DURATION);
  if (!a || !d?.[1] || !d[2]) return null;
  let minutes = num(d[1]);
  if (/^h/.test(d[2])) minutes *= 60;
  const extra = t.slice((d.index ?? 0) + d[0].length).match(/^\s*e\s+(\d+|meia)\s*(min|minutos)?/);
  if (extra?.[1]) minutes += extra[1] === "meia" ? 30 : num(extra[1]);
  if (!(minutes >= 1) || minutes > 1440) return null;
  return { type: "activity", activity: a[1], minutes: Math.round(minutes), met: a[2] };
}

/** Net extra kcal (MET−1) with a 50–90 kg range when weight is unknown. */
export function activityCalories(met: number, minutes: number, weightKg: number | null) {
  const per = (kg: number) => Math.round((met - 1) * kg * (minutes / 60));
  if (weightKg) { const c = per(weightKg); return { calories: c, calories_low: Math.round(c * 0.85), calories_high: Math.round(c * 1.15) }; }
  return { calories: per(70), calories_low: per(50), calories_high: per(90) };
}

export function parseQuickIntent(text: string, now = new Date(), tz = "America/Sao_Paulo"): QuickIntent | null {
  const t = norm(text).replace(/[.!]+$/, "");
  original = new Map(text.toLowerCase().split(/\s+/).map((w) => w.replace(/[.,!]+$/, "")).map((w) => [norm(w), w]));
  if (!t || t.length > 300 || QUESTION.test(t)) return null;
  return parseTask(t, now, tz) ?? parseMoney(t) ?? parseActivity(t) ?? parseMeal(t, localParts(now, tz).h);
}
