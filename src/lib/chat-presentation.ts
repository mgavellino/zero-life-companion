export function customerText(text: string): string {
  return text
    .replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g, "")
    .split("\n")
    .filter(line => !/(?:<\/?(?:script|div|span|button)|\b(?:const|let|var|import|export)\s|\b(?:JSON\.stringify|process\.env|supabase\.|tool_call|GROQ_API_KEY)\b|^\s*\{\s*"|^\s*at\s+.*:\d+:\d+)/i.test(line))
    .join("\n").trim();
}
const ACTIONS: Record<string, string> = {
  remember: "Memória atualizada", add_task: "Tarefa salva", add_transaction: "Lançamento salvo",
  set_budget: "Orçamento atualizado", add_meal: "Refeição salva", notify: "Aviso enviado",
};
export function actionLabel(name: string, state: string, output?: unknown) {
  const label = ACTIONS[name];
  if (!label) return null;
  if (state === "output-error" || (output && typeof output === "object" && "ok" in output && output.ok === false)) return "Não foi possível salvar. Tente novamente.";
  return state === "output-available" ? label : "Salvando…";
}