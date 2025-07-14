-- Xóa bỏ chính sách cũ không chính xác để tránh xung đột
DROP POLICY IF EXISTS "Allow authenticated users to delete logs" ON public.ai_reply_logs;

-- Tạo chính sách mới, cấp quyền xóa cho người dùng đã xác thực
CREATE POLICY "Allow authenticated users to delete logs"
ON public.ai_reply_logs
FOR DELETE
TO authenticated
USING (true);