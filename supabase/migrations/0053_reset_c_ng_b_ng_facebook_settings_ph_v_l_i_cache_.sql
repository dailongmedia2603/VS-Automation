-- Bước 1: Xóa hoàn toàn bảng để đảm bảo một trạng thái sạch.
DROP TABLE IF EXISTS public.facebook_settings;

-- Bước 2: Tạo lại bảng ở dạng đơn giản nhất, không có RLS.
CREATE TABLE public.facebook_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  api_url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_settings_singleton CHECK (id = 1)
);