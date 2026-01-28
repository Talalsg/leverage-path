-- Allow public uploads to deal-documents bucket for intake form
CREATE POLICY "Allow public uploads to intake folder"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'deal-documents' AND (storage.foldername(name))[1] = 'intake');

-- Allow public read access to intake folder  
CREATE POLICY "Allow public read of intake folder"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deal-documents' AND (storage.foldername(name))[1] = 'intake');