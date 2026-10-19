import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Table = "tasks" | "transactions" | "budgets" | "meals" | "workouts" | "memories";

export function useRows<T = Record<string, unknown>>(table: Table, opts?: { order?: string; asc?: boolean; select?: string }) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select(opts?.select ?? "*")
        .order(opts?.order ?? "created_at", { ascending: opts?.asc ?? false });
      if (error) throw error;
      return data as unknown as T[];
    },
  });
}

export function useTableMutations(table: Table | "workout_exercises", extraKeys: string[][] = []) {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: [table] });
    extraKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };
  const onError = (e: Error) => toast.error(e.message);
  const insert = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase.from(table).insert(row as never);
      if (error) throw error;
    },
    onSuccess: done,
    onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...row }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from(table).update(row as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
    onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: done,
    onError,
  });
  return { insert, update, remove };
}

export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number, lang = "pt") =>
  new Intl.NumberFormat(lang === "pt" ? "pt-BR" : lang, { style: "currency", currency: lang === "pt" ? "BRL" : lang === "en" ? "USD" : "EUR" }).format(n);
