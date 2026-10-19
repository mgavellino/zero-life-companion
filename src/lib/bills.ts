import { z } from "zod";

export const billSchema = z.object({ title: z.string().trim().min(1).max(120), amount: z.number().positive().max(100000000), due_day: z.number().int().min(1).max(31), reminder_days: z.number().int().min(0).max(14).default(2), starts_on: z.string().date(), category: z.string().trim().max(40).default("") });
export const CATEGORY_RULES: [RegExp, string][] = [
  [/\b(agua|luz|energia|eletricidade|internet|wifi|gas|telefone|celular|saneamento)\b/, "contas"],
  [/\b(academia|gym|farmacia|medico|hospital|consulta|remedio)\b/, "saúde"],
  [/\b(netflix|spotify|streaming|disney|hbo|prime|assinatura|youtube)\b/, "assinaturas"],
  [/\b(uber|taxi|onibus|metro|gasolina|combustivel|estacionamento)\b/, "transporte"],
  [/\b(mercado|supermercado|feira|hortifruti)\b/, "mercado"],
  [/\b(almoco|jantar|cafe|restaurante|ifood|lanche|pizza|comida)\b/, "alimentação"],
  [/\b(aluguel|condominio|moradia)\b/, "moradia"],
  [/\b(curso|faculdade|escola|livro)\b/, "educação"],
  [/\b(jogo|cinema|festa|passeio)\b/, "lazer"],
  [/\b(salario|salário)\b/, "salário"],
  [/\b(freela|freelance)\b/, "freela"],
];
export function automaticCategory(text: string, supplied = "") {
  if (supplied.trim() && !["auto", "outros"].includes(supplied.trim().toLowerCase())) return supplied.trim().toLowerCase();
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return CATEGORY_RULES.find(([pattern]) => pattern.test(normalized))?.[1] ?? "outros";
}
export function billDueDate(month: string, day: number) {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(year, m, 0).getDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}