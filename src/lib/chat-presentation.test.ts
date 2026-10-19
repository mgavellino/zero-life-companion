import { expect, it } from "vitest";
import { actionLabel, customerText, savedTransaction } from "./chat-presentation";
it("never exposes raw tool identifiers or unknown tools", () => {
  expect(actionLabel("add_transaction", "output-available", { ok: true })).toBe("Lançamento salvo");
  expect(actionLabel("secret_tool", "output-available")).toBeNull();
});
it("only exposes successful saved transaction fields, never tool errors or inputs", () => {
  const transaction = { kind: "expense", amount: 48, category: "alimentação", occurred_on: "2026-10-19", description: "Almoço" };
  expect(savedTransaction("output-available", { ok: true, transaction, error: "secret" })).toEqual(transaction);
  expect(savedTransaction("input-available", { ok: true, transaction })).toBeNull();
  expect(savedTransaction("output-available", { ok: false, transaction, error: "SQL secret" })).toBeNull();
  expect(savedTransaction("output-available", { ok: true, transaction: { ...transaction, amount: "48" } })).toBeNull();
});
it("suppresses code blocks and incomplete streamed code", () => {
  expect(customerText('Pronto!\n```json\n{"amount":30}\n```')).toBe("Pronto!");
  expect(customerText('Pronto!\n```typescript\nconst key =')).toBe("Pronto!");
});
it("does not display raw technical errors", () => {
  expect(customerText('Gasto salvo.\nsuggest_replies|constraint|>options=["Ver resumo financeiro","Criar meta"]')).toBe("Gasto salvo.");
  expect(customerText('Tudo certo.\nprocess.env.GROQ_API_KEY')).toBe("Tudo certo.");
  expect(actionLabel("add_task", "output-available", { ok: false, error: "SQL secret" })).toBe("Não foi possível salvar. Tente novamente.");
});