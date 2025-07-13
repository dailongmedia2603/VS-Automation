-- Gỡ bỏ các chính sách cũ đang yêu cầu đăng nhập
DROP POLICY IF EXISTS "Allow all access for authenticated users on auto_reply" ON public.auto_reply_settings;
DROP POLICY IF EXISTS "Allow all access for authenticated users on care_script" ON public.care_script_settings;
DROP POLICY IF EXISTS "Allow authenticated users to access settings" ON public.chatwoot_settings;

-- Tạo chính sách mới, cho phép mọi người dùng (cả khách và đã đăng nhập) có thể thao tác
CREATE POLICY "Public access for now" ON public.auto_reply_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for now" ON public.care_script_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access for now" ON public.chatwoot_settings FOR ALL USING (true) WITH CHECK (true);