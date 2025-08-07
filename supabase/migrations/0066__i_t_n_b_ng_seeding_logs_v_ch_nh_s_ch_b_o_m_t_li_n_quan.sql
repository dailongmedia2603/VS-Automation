-- Đổi tên bảng
ALTER TABLE public.seeding_logs RENAME TO logs_check_seeding_cmt_tu_dong;

-- Đổi tên chính sách bảo mật cho nhất quán
ALTER POLICY "Allow access via parent post on seeding_logs" ON public.logs_check_seeding_cmt_tu_dong RENAME TO "Allow access via parent post on logs_check_seeding_cmt_tu_dong";