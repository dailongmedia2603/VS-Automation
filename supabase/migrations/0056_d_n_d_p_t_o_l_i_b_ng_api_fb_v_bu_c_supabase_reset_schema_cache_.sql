-- Xóa bảng cũ để đảm bảo trạng thái sạch
DROP TABLE IF EXISTS public.api_fb;

-- Tạo lại bảng với cấu trúc và chính sách bảo mật chuẩn
CREATE TABLE public.api_fb (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT api_fb_singleton CHECK (id = 1)
);

ALTER TABLE public.api_fb ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage API_FB settings"
ON public.api_fb
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Gửi tín hiệu để PostgREST (lớp API của Supabase) tải lại schema cache ngay lập tức
NOTIFY pgrst, 'reload schema';