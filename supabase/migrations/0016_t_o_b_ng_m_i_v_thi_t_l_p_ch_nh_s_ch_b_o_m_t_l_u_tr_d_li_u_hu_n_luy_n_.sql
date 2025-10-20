-- Tạo bảng cho cài đặt Tự động trả lời
CREATE TABLE public.auto_reply_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo bảng cho cài đặt Kịch bản chăm sóc
CREATE TABLE public.care_script_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật Row Level Security cho cả hai bảng
ALTER TABLE public.auto_reply_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_script_settings ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép người dùng đã đăng nhập thực hiện mọi thao tác
CREATE POLICY "Allow all access for authenticated users on auto_reply"
ON public.auto_reply_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access for authenticated users on care_script"
ON public.care_script_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tạo trigger để tự động cập nhật trường 'updated_at'
CREATE TRIGGER set_timestamp_auto_reply
BEFORE UPDATE ON public.auto_reply_settings
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

CREATE TRIGGER set_timestamp_care_script
BEFORE UPDATE ON public.care_script_settings
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();