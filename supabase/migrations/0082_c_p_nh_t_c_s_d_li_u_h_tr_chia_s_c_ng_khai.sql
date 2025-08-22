-- Thêm các cột cần thiết vào bảng dự án quét bài viết
ALTER TABLE public.post_scan_projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.post_scan_projects ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Xóa các chính sách cũ nếu tồn tại để tránh xung đột
DROP POLICY IF EXISTS "Allow public read access for public projects" ON public.post_scan_projects;
DROP POLICY IF EXISTS "Allow public read access for results of public projects" ON public.post_scan_results;

-- Thêm chính sách bảo mật (RLS) để cho phép truy cập công khai
-- Cho phép đọc thông tin dự án nếu nó được đánh dấu là công khai
CREATE POLICY "Allow public read access for public projects"
ON public.post_scan_projects FOR SELECT
USING (is_public = true);

-- Cho phép đọc kết quả của các dự án công khai
CREATE POLICY "Allow public read access for results of public projects"
ON public.post_scan_results FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.post_scan_projects
    WHERE id = post_scan_results.project_id AND is_public = true
  )
);