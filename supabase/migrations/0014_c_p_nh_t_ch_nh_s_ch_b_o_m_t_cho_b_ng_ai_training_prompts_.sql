-- Tắt chính sách cũ
DROP POLICY IF EXISTS "Allow auth users to manage ai_training_prompts" ON public.ai_training_prompts;
DROP POLICY IF EXISTS "Allow public read on ai_training_prompts" ON public.ai_training_prompts;

-- Bật chính sách mới cho phép người dùng đã đăng nhập thực hiện mọi thao tác
CREATE POLICY "Allow all access for authenticated users"
ON public.ai_training_prompts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);