CREATE TABLE public.time_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 category text NOT NULL CHECK (category IN ('work','gaming','study','rest','other')),
 started_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ended_at IS NULL OR ended_at >= started_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_sessions TO authenticated;
GRANT ALL ON public.time_sessions TO service_role;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner time sessions" ON public.time_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX one_running_session_per_owner ON public.time_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX time_sessions_owner_start ON public.time_sessions(user_id, started_at);