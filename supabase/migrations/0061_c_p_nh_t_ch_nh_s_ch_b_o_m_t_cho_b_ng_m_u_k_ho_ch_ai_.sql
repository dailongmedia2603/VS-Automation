-- Gỡ bỏ chính sách cũ
DROP POLICY "Allow users to update their own templates" ON public.ai_plan_templates;

-- Tạo chính sách mới cho phép người dùng đã xác thực cập nhật
CREATE POLICY "Allow authenticated users to update templates" ON public.ai_plan_templates
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);