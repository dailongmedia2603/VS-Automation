-- Xóa bỏ chính sách cũ không chính xác để tránh xung đột
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Tạo chính sách mới, cấp toàn bộ quyền cho người dùng đã xác thực trên đúng bucket
CREATE POLICY "Allow full access to document-uploads for authenticated users"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'document-uploads')
WITH CHECK (bucket_id = 'document-uploads');