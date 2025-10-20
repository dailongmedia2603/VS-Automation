-- Xóa bỏ các chính sách cũ có thể gây xung đột
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow full access to document-uploads for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to document-uploads" ON storage.objects;

-- Tạo một chính sách mới, công khai và permissive để cho phép tải lên
CREATE POLICY "Allow public uploads to document-uploads bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'document-uploads');