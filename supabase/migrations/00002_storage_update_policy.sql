-- Add UPDATE policy for saves storage bucket
CREATE POLICY "Users can update own saves"
  ON storage.objects FOR UPDATE
  USING (auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Change version column to BIGINT to support timestamp-based versioning
ALTER TABLE public.saves ALTER COLUMN version TYPE BIGINT;

-- Index for fast latest-save queries
CREATE INDEX IF NOT EXISTS idx_saves_version_desc ON public.saves(version DESC);
