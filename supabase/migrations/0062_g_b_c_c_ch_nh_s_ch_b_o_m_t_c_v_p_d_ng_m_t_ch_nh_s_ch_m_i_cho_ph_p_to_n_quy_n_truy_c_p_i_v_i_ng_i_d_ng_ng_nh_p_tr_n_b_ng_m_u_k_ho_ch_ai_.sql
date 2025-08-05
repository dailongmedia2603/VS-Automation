-- Gỡ bỏ tất cả các chính sách cũ trên bảng ai_plan_templates để đặt lại quyền
DROP POLICY IF EXISTS "Allow authenticated users to view all templates" ON public.ai_plan_templates;
DROP POLICY IF EXISTS "Allow users to insert their own templates" ON public.ai_plan_templates;
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON public.ai_plan_templates;
DROP POLICY IF EXISTS "Allow users to delete their own templates" ON public.ai_plan_templates;

-- Tạo một chính sách mới, cho phép mọi người dùng đã đăng nhập thực hiện tất cả các hành động
CREATE POLICY "Allow full access for authenticated users" ON public.ai_plan_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);