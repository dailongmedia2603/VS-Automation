-- Xóa các bảng cũ để đảm bảo trạng thái sạch
DROP TABLE IF EXISTS public.api_fb;
DROP TABLE IF EXISTS public.facebook_api_settings;

-- Tạo lại bảng với cấu trúc và chính sách bảo mật chuẩn
CREATE TABLE public.facebook_api_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_api_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.facebook_api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage Facebook API settings"
ON public.facebook_api_settings
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Chèn một dòng dữ liệu mặc định để "khởi động" bảng
INSERT INTO public.facebook_api_settings (id, url, access_token) VALUES (1, '', '') ON CONFLICT (id) DO NOTHING;

-- Gửi tín hiệu để PostgREST (lớp API của Supabase) tải lại schema cache
NOTIFY pgrst, 'reload schema';