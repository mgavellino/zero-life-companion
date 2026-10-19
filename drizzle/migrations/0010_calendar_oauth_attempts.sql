CREATE TABLE public.calendar_oauth_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, nonce_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'));
GRANT ALL ON public.calendar_oauth_attempts TO service_role;
ALTER TABLE public.calendar_oauth_attempts ENABLE ROW LEVEL SECURITY;