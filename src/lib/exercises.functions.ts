import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExerciseHit = { id: string; name: string; target: string; bodyPart: string; equipment: string; gif: string };

export const searchExercises = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { q: string }) => ({ q: String(i.q).slice(0, 60) }))
  .handler(async ({ data }): Promise<{ configured: boolean; hits: ExerciseHit[] }> => {
    const key = process.env["EXERCISEDB_API_KEY"];
    if (!key) return { configured: false, hits: [] };
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(data.q.toLowerCase())}?limit=12`,
      { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "exercisedb.p.rapidapi.com" } },
    );
    if (!res.ok) throw new Error(`ExerciseDB ${res.status}`);
    const list = (await res.json()) as { id: string; name: string; target: string; bodyPart: string; equipment: string }[];
    return {
      configured: true,
      hits: list.map((e) => ({ ...e, gif: `/api/exercise-gif/${e.id}` })),
    };
  });
