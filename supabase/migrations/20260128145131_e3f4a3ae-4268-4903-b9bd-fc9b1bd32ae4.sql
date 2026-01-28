-- Create storage bucket for deal documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('deal-documents', 'deal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for deal documents
CREATE POLICY "Users can view their own deal documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own deal documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'deal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own deal documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'deal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own deal documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'deal-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);