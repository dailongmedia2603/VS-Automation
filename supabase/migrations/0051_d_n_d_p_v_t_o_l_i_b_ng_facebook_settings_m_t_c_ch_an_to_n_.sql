-- Bước 1: Dọn dẹp triệt để bằng cách xóa bảng nếu nó tồn tại.
-- Thao tác này cũng sẽ tự động xóa các chính sách bảo mật liên quan.
DROP TABLE IF EXISTS public.facebook_settings;

-- Bước 2: Tạo lại bảng từ đầu.
CREATE TABLE public.facebook_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  api_url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_settings_singleton CHECK (id = 1)
);

-- Bước 3: Kích hoạt lại Row Level Security (Bảo mật cấp dòng).
ALTER TABLE public.facebook_settings ENABLE ROW LEVEL SECURITY;

-- Bước 4: Tạo lại chính sách bảo mật, cho phép người dùng đã đăng nhập được truy cập.
CREATE POLICY "Allow authenticated users to manage Facebook settings"
ON public.facebook_settings
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);