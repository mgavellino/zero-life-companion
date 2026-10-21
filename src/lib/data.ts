import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUnits } from "@/lib/units";

type Table = "tasks" | "transactions" | "budgets" | "meals" | "workouts" | "memories" | "habits" | "habit_checks" | "energy_profiles" | "energy_activities" | "financial_goals" | "custom_foods" | "custom_exercises";

export function useRows<T = Record<string, unknown>>(table: Table, opts?: { order?: string; asc?: boolean; select?: string }) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Entre na sua conta para continuar.");
      const { data, error } = await supabase
        .from(table)
        .select(opts?.select ?? "*")
        .eq("user_id", auth.user.id)
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
  const onError = () => toast.error("Não foi possível salvar a alteração. Tente novamente.");
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

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const money = (n: number, lang = "pt") => {
  const locale = lang === "pt" ? "pt-BR" : lang;
  let currency = lang === "pt" ? "BRL" : lang === "en" ? "USD" : "EUR";
  try {
    currency = getUnits().currency;
  } catch {
    // units store unavailable (SSR); keep locale default
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
};
