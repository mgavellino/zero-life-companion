import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dumbbell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useTableMutations } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/academia")({
  head: () => ({ meta: [{ title: "Academia — Zero" }, { name: "description", content: "Fichas de treino com demonstrações." }, { property: "og:title", content: "Academia — Zero" }, { property: "og:description", content: "Fichas de treino com demonstrações." }] }),
  component: Gym,
});

type W = { id: string; name: string; notes: string | null; workout_exercises: { id: string }[] };

function Gym() {
  const child = useMatch({ from: "/_authenticated/academia/$workoutId", shouldThrow: false });
  if (child) return <Outlet />;
  return <GymList />;
}

function GymList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data = [] } = useRows<W>("workouts", { select: "id,name,notes,workout_exercises(id)" });
  const m = useTableMutations("workouts");
  const [name, setName] = useState("");

  return (
    <Page
      kicker={t("nav.gym")}
      title={t("workouts")}
      actions={
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name) return;
            const { data: w } = await supabase.from("workouts").insert({ name }).select("id").single();
            setName("");
            if (w) navigate({ to: "/academia/$workoutId", params: { workoutId: w.id } });
          }}
        >
          <Input placeholder={t("workoutName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">{t("newWorkout")}</Button>
        </form>
      }
    >
      {data.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((w) => (
          <div key={w.id} className="group relative rounded-2xl border bg-card p-5 hover:border-ring">
            <Link to="/academia/$workoutId" params={{ workoutId: w.id }} className="block">
              <Dumbbell className="size-6 text-body" />
              <h3 className="mt-4 text-xl font-bold">{w.name}</h3>
              <p className="text-sm text-muted-foreground">{w.workout_exercises.length} {t("exercises").toLowerCase()}</p>
            </Link>
            <button aria-label={t("delete")} onClick={() => m.remove.mutate(w.id)} className="absolute right-4 top-4 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Page>
  );
}
