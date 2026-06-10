-- Add last_seen column for online presence tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen DESC);
