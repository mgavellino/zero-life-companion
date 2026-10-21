CREATE TABLE public.custom_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kcal_100g numeric NOT NULL CHECK (kcal_100g >= 0 AND kcal_100g <= 950),
  protein_100g numeric NOT NULL DEFAULT 0 CHECK (protein_100g >= 0 AND protein_100g <= 100),
  carbs_100g numeric NOT NULL DEFAULT 0 CHECK (carbs_100g >= 0 AND carbs_100g <= 100),
  fat_100g numeric NOT NULL DEFAULT 0 CHECK (fat_100g >= 0 AND fat_100g <= 100),
  unit_grams numeric CHECK (unit_grams IS NULL OR (unit_grams > 0 AND unit_grams <= 5000)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_foods TO authenticated;
GRANT ALL ON public.custom_foods TO service_role;
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom foods" ON public.custom_foods FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX custom_foods_user_idx ON public.custom_foods(user_id);

CREATE TABLE public.custom_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kcal_per_hour numeric NOT NULL CHECK (kcal_per_hour > 0 AND kcal_per_hour <= 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_exercises TO authenticated;
GRANT ALL ON public.custom_exercises TO service_role;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own custom exercises" ON public.custom_exercises FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX custom_exercises_user_idx ON public.custom_exercises(user_id);