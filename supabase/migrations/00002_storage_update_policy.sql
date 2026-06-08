-- Add UPDATE policy for saves storage bucket
-- Needed for upsert operations on storage.objects

CREATE POLICY "Users can update own saves"
  ON storage.objects FOR UPDATE
  USING (auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Add index on saves version for faster latest-save queries
CREATE INDEX IF NOT EXISTS idx_saves_version ON public.saves(version DESC);

-- Cleanup function: delete saves older than the latest N per game/user/type
CREATE OR REPLACE FUNCTION public.cleanup_old_saves()
RETURNS TRIGGER AS $$
DECLARE
  keep_count CONSTANT INTEGER := 10;
BEGIN
  DELETE FROM public.saves
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY game_id, user_id, save_type
        ORDER BY version DESC
      ) AS rn
      FROM public.saves
      WHERE game_id = NEW.game_id
        AND user_id = NEW.user_id
        AND save_type = NEW.save_type
    ) ranked
    WHERE ranked.rn > keep_count
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_old_saves_after_insert
  AFTER INSERT ON public.saves
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_saves();
