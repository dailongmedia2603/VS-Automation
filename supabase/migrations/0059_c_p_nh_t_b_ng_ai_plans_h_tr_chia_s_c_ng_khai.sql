-- Thêm các cột cần thiết vào bảng ai_plans
ALTER TABLE public.ai_plans ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.ai_plans ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Tạo chính sách RLS mới để cho phép truy cập công khai
DROP POLICY IF EXISTS "Allow public read access to public plans" ON public.ai_plans;
CREATE POLICY "Allow public read access to public plans"
ON public.ai_plans
FOR SELECT
USING (is_public = true);