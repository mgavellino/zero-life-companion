import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play, Trash2, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Card } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTableMutations } from "@/lib/data";
import { searchExercises, type ExerciseHit } from "@/lib/exercises.functions";

export const Route = createFileRoute("/_authenticated/academia/$workoutId")({
  component: WorkoutEditor,
});

type Ex = { id: string; name: string; gif_url: string | null; target: string | null; sets: number; reps: string; rest_seconds: number; weight: string | null; position: number };

function WorkoutEditor() {
  const { workoutId } = Route.useParams();
  const { t } = useTranslation();
  const key = ["workout", workoutId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("id,name,notes,workout_exercises(*)").eq("id", workoutId).single();
      if (error) throw error;
      return { ...data, workout_exercises: [...(data.workout_exercises as Ex[])].sort((a, b) => a.position - b.position) };
    },
  });
  const m = useTableMutations("workout_exercises", [key, ["workouts"]]);
  const search = useServerFn(searchExercises);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ExerciseHit[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const exs = data?.workout_exercises ?? [];

  const add = (row: Partial<Ex>) => m.insert.mutate({ workout_id: workoutId, position: exs.length, sets: 3, reps: "10", rest_seconds: 60, ...row });

  return (
    <Page
      kicker={t("nav.gym")}
      title={data?.name ?? "…"}
      actions={<Button asChild variant="ghost"><Link to="/academia"><ArrowLeft className="size-4" /> {t("workouts")}</Link></Button>}
    >
      <Card className="mb-6">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!q.trim()) return;
            setBusy(true);
            try {
              const r = await search({ data: { q } });
              setConfigured(r.configured);
              setHits(r.hits);
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input placeholder={t("searchExercise")} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" disabled={busy}><Search className="size-4" /></Button>
          <Button type="button" variant="outline" onClick={() => q.trim() && (add({ name: q.trim() }), setQ(""))}>
            <Plus className="size-4" /> {t("manualExercise")}
          </Button>
        </form>
        {!configured && <p className="mt-3 text-sm text-muted-foreground">{t("noDemo")}</p>}
        {hits && hits.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {hits.map((h) => (
              <button
                key={h.id}
                onClick={() => add({ name: h.name, gif_url: h.gif, target: h.target, exercise_id: h.id } as Partial<Ex>)}
                className="overflow-hidden rounded-xl border bg-background text-left hover:border-ring"
              >
                <img src={h.gif} alt={h.name} loading="lazy" className="aspect-square w-full bg-card object-contain" />
                <div className="p-2 text-xs">
                  <p className="font-semibold capitalize">{h.name}</p>
                  <p className="text-muted-foreground">{h.target} · {h.equipment}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {exs.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
        {exs.map((x, idx) => (
          <div key={x.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4 sm:w-72">
              <span className="font-display text-2xl font-bold text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
              {x.gif_url ? (
                <img src={x.gif_url} alt={x.name} loading="lazy" className="size-20 rounded-lg bg-background object-contain" />
              ) : (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(x.name + " exercise form")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-20 place-items-center rounded-lg bg-muted text-muted-foreground"
                  aria-label={t("demo")}
                >
                  <Play className="size-6" />
                </a>
              )}
              <div className="min-w-0">
                <p className="font-semibold capitalize">{x.name}</p>
                {x.target && <p className="text-xs text-muted-foreground">{x.target}</p>}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-2">
              {(
                [
                  ["sets", t("sets"), "number"],
                  ["reps", t("reps"), "text"],
                  ["weight", t("weight"), "text"],
                  ["rest_seconds", t("rest"), "number"],
                ] as const
              ).map(([k, label, type]) => (
                <label key={k} className="text-xs text-muted-foreground">
                  {label}
                  <Input
                    type={type}
                    defaultValue={String(x[k] ?? "")}
                    onBlur={(e) => {
                      const v = type === "number" ? Number(e.target.value) : e.target.value;
                      if (v !== x[k]) m.update.mutate({ id: x.id, [k]: v });
                    }}
                  />
                </label>
              ))}
            </div>
            <button aria-label={t("delete")} onClick={() => m.remove.mutate(x.id)} className="self-end text-muted-foreground hover:text-destructive sm:self-center">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Page>
  );
}
