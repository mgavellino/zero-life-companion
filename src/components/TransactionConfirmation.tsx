import { CheckCircle2 } from "lucide-react";
import { money } from "@/lib/data";

export type ConfirmedTransaction = { kind: "income" | "expense"; amount: number; category: string; description?: string | null; occurred_on: string };

export function TransactionConfirmation({ transaction, action }: { transaction: ConfirmedTransaction; action?: React.ReactNode }) {
  const date = new Date(`${transaction.occurred_on}T12:00:00`);
  return (
    <div role="status" className="min-w-0 rounded-lg border border-money/25 bg-money/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-money">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>{transaction.kind === "expense" ? "Despesa registrada" : "Receita registrada"}</span>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
      <p className="mt-3 break-words font-display text-2xl font-semibold text-foreground">{money(transaction.amount)}</p>
      {transaction.description && <p className="mt-1 break-words text-sm text-foreground">{transaction.description}</p>}
      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-3 border-t border-money/15 pt-3 text-xs">
        <div className="min-w-0"><dt className="text-muted-foreground">Categoria</dt><dd className="mt-1 break-words font-medium capitalize">{transaction.category}</dd></div>
        <div className="min-w-0"><dt className="text-muted-foreground">Data</dt><dd className="mt-1 font-medium">{date.toLocaleDateString("pt-BR")}</dd></div>
      </dl>
    </div>
  );
}