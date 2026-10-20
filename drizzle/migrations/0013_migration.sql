ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS priorities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wake_time text,
  ADD COLUMN IF NOT EXISTS sleep_time text,
  ADD COLUMN IF NOT EXISTS work_start text,
  ADD COLUMN IF NOT EXISTS work_end text,
  ADD COLUMN IF NOT EXISTS free_days integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monthly_income numeric CHECK (monthly_income IS NULL OR (monthly_income >= 0 AND monthly_income <= 100000000)),
  ADD COLUMN IF NOT EXISTS monthly_budget numeric CHECK (monthly_budget IS NULL OR (monthly_budget >= 0 AND monthly_budget <= 100000000)),
  ADD COLUMN IF NOT EXISTS diet_goal text CHECK (diet_goal IS NULL OR diet_goal IN ('lose','maintain','gain','health')),
  ADD COLUMN IF NOT EXISTS activity_level text CHECK (activity_level IS NULL OR activity_level IN ('sedentary','light','moderate','active','very_active')),
  ADD COLUMN IF NOT EXISTS dietary_restrictions text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body text CHECK (body IS NULL OR length(body) <= 400),
  cta_label text CHECK (cta_label IS NULL OR length(cta_label) <= 40),
  cta_url text CHECK (cta_url IS NULL OR cta_url ~ '^(/|https://)'),
  image_url text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions public live" ON public.promotions FOR SELECT TO anon, authenticated
  USING (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "promotions admin read" ON public.promotions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "promotions admin insert" ON public.promotions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "promotions admin update" ON public.promotions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "promotions admin delete" ON public.promotions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));