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

type DKey = "value" | "desc" | "cat" | "when" | "kcal" | "prot" | "carb" | "fat" | "dur" | "burn" | "range" | "limit" | "seeMoney" | "seeTime" | "seeDiet" | "seeBills" | "fix" | "noDate";
const D: Record<Lang, Record<DKey, string>> = {
  pt: { value: "Valor", desc: "Descrição", cat: "Categoria", when: "Quando", kcal: "Calorias", prot: "Proteína", carb: "Carboidrato", fat: "Gordura", dur: "Duração", burn: "Gasto estimado", range: "faixa", limit: "Limite por mês", seeMoney: "Você vê isso em Dinheiro, junto com o saldo do mês.", seeTime: "Ela aparece em Tempo, na sua lista de tarefas.", seeDiet: "Já entrou no total de hoje em Dieta.", seeBills: "Fica em Dinheiro → Contas do mês, e eu aviso antes de vencer.", fix: "Se algo estiver errado, é só me dizer que eu corrijo.", noDate: "Sem horário definido — me diga quando, se quiser um aviso." },
  en: { value: "Amount", desc: "Description", cat: "Category", when: "When", kcal: "Calories", prot: "Protein", carb: "Carbs", fat: "Fat", dur: "Duration", burn: "Estimated burn", range: "range", limit: "Monthly limit", seeMoney: "You'll see it in Money, with this month's balance.", seeTime: "It shows up in Time, in your task list.", seeDiet: "It's already in today's total in Diet.", seeBills: "It's in Money → Monthly bills, and I'll remind you before it's due.", fix: "If anything is wrong, just tell me and I'll fix it.", noDate: "No time set — tell me when if you want a reminder." },
  es: { value: "Valor", desc: "Descripción", cat: "Categoría", when: "Cuándo", kcal: "Calorías", prot: "Proteína", carb: "Carbohidratos", fat: "Grasa", dur: "Duración", burn: "Gasto estimado", range: "rango", limit: "Límite mensual", seeMoney: "Lo verás en Dinero, con el saldo del mes.", seeTime: "Aparece en Tiempo, en tu lista de tareas.", seeDiet: "Ya está en el total de hoy en Dieta.", seeBills: "Está en Dinero → Cuentas del mes, y te aviso antes del vencimiento.", fix: "Si algo está mal, dímelo y lo corrijo.", noDate: "Sin hora — dime cuándo si quieres un aviso." },
  fr: { value: "Montant", desc: "Description", cat: "Catégorie", when: "Quand", kcal: "Calories", prot: "Protéines", carb: "Glucides", fat: "Lipides", dur: "Durée", burn: "Dépense estimée", range: "fourchette", limit: "Limite mensuelle", seeMoney: "Visible dans Argent, avec le solde du mois.", seeTime: "Elle apparaît dans Temps, dans vos tâches.", seeDiet: "Déjà ajouté au total du jour dans Diète.", seeBills: "Dans Argent → Factures du mois ; je vous préviens avant l'échéance.", fix: "Si quelque chose ne va pas, dites-le-moi et je corrige.", noDate: "Pas d'heure — dites-moi quand si vous voulez un rappel." },
  de: { value: "Betrag", desc: "Beschreibung", cat: "Kategorie", when: "Wann", kcal: "Kalorien", prot: "Eiweiß", carb: "Kohlenhydrate", fat: "Fett", dur: "Dauer", burn: "Geschätzter Verbrauch", range: "Spanne", limit: "Monatslimit", seeMoney: "Du findest es unter Geld, mit dem Monatssaldo.", seeTime: "Sie erscheint unter Zeit in deiner Aufgabenliste.", seeDiet: "Schon in der heutigen Summe unter Ernährung.", seeBills: "Unter Geld → Monatsrechnungen; ich erinnere dich vor Fälligkeit.", fix: "Wenn etwas falsch ist, sag es mir und ich korrigiere es.", noDate: "Keine Uhrzeit — sag mir wann, wenn du eine Erinnerung willst." },
  it: { value: "Importo", desc: "Descrizione", cat: "Categoria", when: "Quando", kcal: "Calorie", prot: "Proteine", carb: "Carboidrati", fat: "Grassi", dur: "Durata", burn: "Consumo stimato", range: "intervallo", limit: "Limite mensile", seeMoney: "Lo trovi in Denaro, con il saldo del mese.", seeTime: "Compare in Tempo, nella lista attività.", seeDiet: "È già nel totale di oggi in Dieta.", seeBills: "È in Denaro → Bollette del mese; ti avviso prima della scadenza.", fix: "Se qualcosa non va, dimmelo e lo correggo.", noDate: "Nessun orario — dimmi quando se vuoi un promemoria." },
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
  const d = D[lang];
  const blocks: string[] = [];
  const hints = new Set<string>();
  const item = (label: string, v: string | null | false) => (v ? `• ${label}: ${v}` : "");
  const push = (head: string, rows: string[], hint?: string) => { blocks.push([`✅ **${head}**`, ...rows.filter(Boolean)].join("\n")); if (hint) hints.add(hint); };
  let saved = 0;
  for (const { toolName, output } of results) {
    const o = rec(output);
    if (o.ok !== true) { blocks.push(`⚠️ ${str(o.message) || t.fail}`); continue; }
    saved++;
    switch (toolName) {
      case "add_transaction": {
        const tx = rec(o.transaction); const amount = num(tx.amount);
        push(tx.kind === "income" ? t.income : t.expense, [item(d.value, amount === null ? null : `**${money(amount)}**`), item(d.desc, str(tx.description)), item(d.cat, str(tx.category))], d.seeMoney);
        break;
      }
      case "add_task": {
        const due = str(o.due_at);
        push(due ? t.task : t.taskNoDate, [`• ${str(o.task)}`, due ? item(d.when, `**${when(due)}**`) : `• ${d.noDate}`, due ? `• ${t.alert}` : ""], d.seeTime);
        break;
      }
      case "add_meal": {
        const kcal = num(o.calories);
        push(t.meal, [`• ${str(o.name)}`, item(d.kcal, kcal === null ? null : `**${Math.round(kcal)} kcal**`), kcal === null ? "" : `• ${d.prot} ${Math.round(num(o.protein) ?? 0)} g · ${d.carb} ${Math.round(num(o.carbs) ?? 0)} g · ${d.fat} ${Math.round(num(o.fat) ?? 0)} g`], d.seeDiet);
        break;
      }
      case "log_activity": {
        const kcal = num(o.calories), lo = num(o.calories_low), hi = num(o.calories_high);
        push(t.activity, [`• ${str(o.activity)}`, item(d.dur, num(o.minutes) ? `${num(o.minutes)} min` : null), item(d.burn, kcal === null ? null : `**~${Math.round(kcal)} kcal**${lo !== null && hi !== null ? ` (${d.range} ${Math.round(lo)}–${Math.round(hi)})` : ""}`)], d.seeDiet);
        break;
      }
      case "add_monthly_bill": {
        const amount = num(o.amount);
        push(t.bill, [`• ${str(o.title)}`, item(d.value, amount === null ? null : `**${money(amount)}**`), num(o.due_day) ? `• ${t.day} ${num(o.due_day)}` : ""], d.seeBills);
        break;
      }
      case "set_budget": {
        const limit = num(o.monthly_limit);
        push(t.budget, [item(d.cat, str(o.category)), item(d.limit, limit === null ? null : `**${money(limit)}**`)], d.seeMoney);
        break;
      }
      case "remember": blocks.push(`✅ ${t.memory}`); break;
      case "notify": blocks.push(`✅ ${t.notify}`); break;
    }
  }
  const tail = [...hints];
  if (saved) tail.push(d.fix);
  return [blocks.join("\n\n"), tail.join(" ")].filter(Boolean).join("\n\n");
}
