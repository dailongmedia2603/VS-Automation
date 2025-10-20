-- Create a new bucket for document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-uploads', 'document-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create a security policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document-uploads');