import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Est = { name: string; calories: number; protein: number; carbs: number; fat: number };

// User types food + quantity; Groq estimates calories and macros, then the meal is saved.
export const logMealAuto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { text: string; meal_type: string }) => ({
    text: String(i.text).slice(0, 500),
    meal_type: ["cafe", "almoco", "lanche", "jantar"].includes(i.meal_type) ? i.meal_type : "almoco",
  }))
  .handler(async ({ data, context }) => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) throw new Error("GROQ_API_KEY ausente");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a nutritionist. Estimate the TOTAL nutrition of the food described, using the quantities given (assume a typical portion if missing). Reply ONLY with JSON: {"name": short name in the user\'s language, "calories": integer kcal, "protein": grams, "carbs": grams, "fat": grams}.',
          },
          { role: "user", content: data.text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`IA ${res.status}`);
    const j = (await res.json()) as { choices: { message: { content: string } }[] };
    const e = JSON.parse(j.choices[0]?.message.content ?? "{}") as Est;
    const row = {
      user_id: context.userId,
      name: e.name || data.text.slice(0, 60),
      meal_type: data.meal_type,
      calories: Math.round(Number(e.calories) || 0),
      protein: Math.round((Number(e.protein) || 0) * 10) / 10,
      carbs: Math.round((Number(e.carbs) || 0) * 10) / 10,
      fat: Math.round((Number(e.fat) || 0) * 10) / 10,
    };
    const { error } = await context.supabase.from("meals").insert(row);
    if (error) throw new Error(error.message);
    return row;
  });
