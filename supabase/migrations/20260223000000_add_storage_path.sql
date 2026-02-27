-- Add storage_path column to certificates_history
ALTER TABLE certificates_history ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create bucket for certificates if it doesn't exist
-- Note: This usually needs to be done via Supabase Dashboard or Admin API
-- But we can ensure RLS policies for storage objects here if the bucket exists.

-- Policy to allow users to see their own files in storage
-- (Assumes bucket is named 'certificates')
-- CREATE POLICY "Users can access their own certificates"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can upload their own certificates"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
