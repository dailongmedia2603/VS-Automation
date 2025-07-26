-- Dọn dẹp và tạo lại bảng api_fb với chính sách bảo mật chính xác
DROP TABLE IF EXISTS public.api_fb;

CREATE TABLE public.api_fb (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT api_fb_singleton CHECK (id = 1)
);

ALTER TABLE public.api_fb ENABLE ROW LEVEL SECURITY;

-- Áp dụng chính sách bảo mật nhất quán với các bảng khác
CREATE POLICY "Allow authenticated users to manage API_FB settings"
ON public.api_fb
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);