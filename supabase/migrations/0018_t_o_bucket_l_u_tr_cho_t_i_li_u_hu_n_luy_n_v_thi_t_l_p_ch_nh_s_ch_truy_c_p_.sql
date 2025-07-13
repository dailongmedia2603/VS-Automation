-- Tạo bucket mới nếu chưa tồn tại
INSERT INTO storage.buckets (id, name, public)
VALUES ('training_documents', 'training_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Xóa chính sách cũ nếu có để tránh xung đột
DROP POLICY IF EXISTS "Allow public access to training documents" ON storage.objects;

-- Tạo chính sách cho phép mọi người dùng có thể xem, thêm, sửa, xóa file trong bucket
CREATE POLICY "Allow public access to training documents"
ON storage.objects FOR ALL
USING ( bucket_id = 'training_documents' );