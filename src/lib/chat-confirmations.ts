/** Instant, deterministic confirmations for saved chat actions (no second model call). */
export type ActionResult = { toolName: string; output: unknown };
type Lang = "pt" | "en" | "es" | "fr" | "de" | "it";

type Key = "expense" | "income" | "task" | "taskNoDate" | "meal" | "activity" | "bill" | "day" | "budget" | "memory" | "notify" | "fail" | "alert";
const T: Record<Lang, Record<Key, string>> = {
  pt: { expense: "Despesa registrada", income: "Receita registrada", task: "Tarefa agendada", taskNoDate: "Tarefa salva", meal: "Refeição registrada", activity: "Atividade registrada", bill: "Conta mensal salva", day: "vence dia", budget: "Orçamento definido", memory: "Anotado, vou lembrar disso.", notify: "Aviso enviado.", fail: "Não consegui salvar isso agora. Tente novamente.", alert: "Vou te avisar na hora." },
  en: { expense: "Expense saved", income: "Income saved", task: "Task scheduled", taskNoDate: "Task saved", meal: "Meal logged", activity: "Activity logged", bill: "Monthly bill saved", day: "due on day", budget: "Budget set", memory: "Noted, I'll remember that.", notify: "Notification sent.", fail: "I couldn't save that right now. Please try again.", alert: "I'll remind you on time." },
  es: { expense: "Gasto registrado", income: "Ingreso registrado", task: "Tarea programada", taskNoDate: "Tarea guardada", meal: "Comida registrada", activity: "Actividad registrada", bill: "Cuenta mensual guardada", day: "vence el día", budget: "Presupuesto definido", memory: "Anotado, lo recordaré.", notify: "Aviso enviado.", fail: "No pude guardarlo ahora. Inténtalo de nuevo.", alert: "Te avisaré a tiempo." },
  fr: { expense: "Dépense enregistrée", income: "Revenu enregistré", task: "Tâche planifiée", taskNoDate: "Tâche enregistrée", meal: "Repas enregistré", activity: "Activité enregistrée", bill: "Facture mensuelle enregistrée", day: "échéance le", budget: "Budget défini", memory: "Noté, je m'en souviendrai.", notify: "Notification envoyée.", fail: "Je n'ai pas pu l'enregistrer. Réessayez.", alert: "Je vous préviendrai à l'heure." },
  de: { expense: "Ausgabe gespeichert", income: "Einnahme gespeichert", task: "Aufgabe geplant", taskNoDate: "Aufgabe gespeichert", meal: "Mahlzeit erfasst", activity: "Aktivität erfasst", bill: "Monatsrechnung gespeichert", day: "fällig am", budget: "Budget festgelegt", memory: "Notiert, ich merke es mir.", notify: "Benachrichtigung gesendet.", fail: "Konnte das gerade nicht speichern. Bitte erneut versuchen.", alert: "Ich erinnere dich rechtzeitig." },
  it: { expense: "Spesa registrata", income: "Entrata registrata", task: "Attività programmata", taskNoDate: "Attività salvata", meal: "Pasto registrato", activity: "Attività fisica registrata", bill: "Bolletta mensile salvata", day: "scade il giorno", budget: "Budget impostato", memory: "Annotato, me lo ricorderò.", notify: "Notifica inviata.", fail: "Non sono riuscito a salvarlo. Riprova.", alert: "Ti avviserò in tempo." },
};
const LOCALE: Record<Lang, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };

type Field = "ok" | "message" | "transaction" | "amount" | "kind" | "description" | "category" | "task" | "due_at" | "name" | "calories" | "protein" | "carbs" | "fat" | "activity" | "minutes" | "calories_low" | "calories_high" | "title" | "due_day" | "monthly_limit";
const rec = (v: unknown): Partial<Record<Field, unknown>> => (v && typeof v === "object" ? (v as Partial<Record<Field, unknown>>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function confirmActions(results: ActionResult[], opts: { lang?: string | undefined; currency?: string | undefined; tz?: string | undefined }): string {
  const lang = (opts.lang && opts.lang in T ? opts.lang : "pt") as Lang;
  const t = T[lang];
  const locale = LOCALE[lang];
  const money = (n: number) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency: opts.currency || "BRL" }).format(n); } catch { return n.toFixed(2); } };
  const when = (iso: string) => { try { return new Intl.DateTimeFormat(locale, { timeZone: opts.tz || "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch { return iso; } };
  const lines: string[] = [];
  for (const { toolName, output } of results) {
    const o = rec(output);
    if (o.ok !== true) { lines.push(`⚠️ ${str(o.message) || t.fail}`); continue; }
    switch (toolName) {
      case "add_transaction": {
        const tx = rec(o.transaction); const amount = num(tx.amount);
        lines.push(`✅ ${tx.kind === "income" ? t.income : t.expense}: **${amount === null ? "" : money(amount)}**${str(tx.description) ? ` · ${str(tx.description)}` : ""}${str(tx.category) ? ` (${str(tx.category)})` : ""}`);
        break;
      }
      case "add_task": {
        const due = str(o.due_at);
        lines.push(due ? `✅ ${t.task}: **${str(o.task)}** — ${when(due)}. ${t.alert}` : `✅ ${t.taskNoDate}: **${str(o.task)}**`);
        break;
      }
      case "add_meal": {
        const kcal = num(o.calories);
        lines.push(`✅ ${t.meal}: **${str(o.name)}**${kcal === null ? "" : ` — ${Math.round(kcal)} kcal · P ${Math.round(num(o.protein) ?? 0)}g · C ${Math.round(num(o.carbs) ?? 0)}g · G ${Math.round(num(o.fat) ?? 0)}g`}`);
        break;
      }
      case "log_activity": {
        const kcal = num(o.calories);
        lines.push(`✅ ${t.activity}: **${str(o.activity)}**${num(o.minutes) ? ` · ${num(o.minutes)} min` : ""}${kcal === null ? "" : ` · ~${Math.round(kcal)} kcal${num(o.calories_low) !== null && num(o.calories_high) !== null ? ` (${Math.round(num(o.calories_low)!)}–${Math.round(num(o.calories_high)!)})` : ""}`}`);
        break;
      }
      case "add_monthly_bill": {
        const amount = num(o.amount);
        lines.push(`✅ ${t.bill}: **${str(o.title)}**${amount === null ? "" : ` · ${money(amount)}`}${num(o.due_day) ? ` · ${t.day} ${num(o.due_day)}` : ""}`);
        break;
      }
      case "set_budget": {
        const limit = num(o.monthly_limit);
        lines.push(`✅ ${t.budget}: **${str(o.category)}**${limit === null ? "" : ` · ${money(limit)}`}`);
        break;
      }
      case "remember": lines.push(`✅ ${t.memory}`); break;
      case "notify": lines.push(`✅ ${t.notify}`); break;
    }
  }
  return lines.join("\n");
}
