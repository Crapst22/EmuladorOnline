-- Add N64 extensions to storage upload policy
DROP POLICY IF EXISTS "Users can upload roms" ON storage.objects;
CREATE POLICY "Users can upload roms"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.uid()::text = (storage.foldername(name))[1]
    AND (storage.extension(name) = 'smc' OR storage.extension(name) = 'sfc' OR storage.extension(name) = 'fig' OR storage.extension(name) = 'gba' OR storage.extension(name) = 'n64' OR storage.extension(name) = 'z64' OR storage.extension(name) = 'v64')
  );
