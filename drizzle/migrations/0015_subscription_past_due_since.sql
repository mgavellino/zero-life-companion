ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS past_due_since timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_event_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env ON public.subscriptions(user_id, environment);