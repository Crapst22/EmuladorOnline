-- Add admin role to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add archived flag to games (user can hide from dashboard without deleting)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add file_hash to games for duplicate file detection
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_games_file_hash ON public.games(file_hash);

-- Allow all authenticated users to view all user profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to view all games
DROP POLICY IF EXISTS "Users can view own games" ON public.games;
DROP POLICY IF EXISTS "Users can view all games" ON public.games;
CREATE POLICY "Users can view all games"
  ON public.games FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admin can update any game
DROP POLICY IF EXISTS "Admin can update any game" ON public.games;
CREATE POLICY "Admin can update any game"
  ON public.games FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Admin can delete any game
DROP POLICY IF EXISTS "Admin can delete any game" ON public.games;
CREATE POLICY "Admin can delete any game"
  ON public.games FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Allow all authenticated users to view/download any ROM
DROP POLICY IF EXISTS "Users can view own roms" ON storage.objects;
DROP POLICY IF EXISTS "Users can view any rom" ON storage.objects;
CREATE POLICY "Users can view any rom"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'roms' AND auth.role() = 'authenticated');

-- Admin can delete any ROM from storage
DROP POLICY IF EXISTS "Admin can delete any rom from storage" ON storage.objects;
CREATE POLICY "Admin can delete any rom from storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'roms' 
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
