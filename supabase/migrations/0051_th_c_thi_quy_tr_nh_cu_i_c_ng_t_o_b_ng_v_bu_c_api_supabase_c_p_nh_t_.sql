-- 1. Xóa hoàn toàn bảng cũ và các đối tượng phụ thuộc để đảm bảo trạng thái sạch
DROP TABLE IF EXISTS public.facebook_api_settings CASCADE;

-- 2. Tạo lại bảng với cấu trúc và chính sách bảo mật chuẩn
CREATE TABLE public.facebook_api_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_api_settings_singleton CHECK (id = 1)
);

-- 3. Kích hoạt Row Level Security
ALTER TABLE public.facebook_api_settings ENABLE ROW LEVEL SECURITY;

-- 4. Áp dụng chính sách bảo mật cho phép người dùng đã xác thực quản lý cài đặt
CREATE POLICY "Allow authenticated users to manage Facebook API settings"
ON public.facebook_api_settings
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- 5. Chèn một dòng dữ liệu mặc định để "khởi động" bảng
INSERT INTO public.facebook_api_settings (id, url, access_token) VALUES (1, '', '') ON CONFLICT (id) DO NOTHING;

-- 6. Gửi lệnh trực tiếp yêu cầu API của Supabase xóa cache và tải lại cấu trúc mới
NOTIFY pgrst, 'reload schema';