-- Xóa hàm cũ đi để có thể tạo lại với cấu trúc mới
DROP FUNCTION IF EXISTS public.get_posts_with_stats_by_project(bigint);

-- Tạo lại hàm với các cột trả về đã được cập nhật chính xác
CREATE FUNCTION public.get_posts_with_stats_by_project(p_project_id bigint)
 RETURNS TABLE(id bigint, project_id bigint, name text, type seeding_post_type, content text, links text, status seeding_post_status, created_at timestamp with time zone, is_notification_seen boolean, visible_count bigint, total_count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.project_id,
    p.name,
    p.type,
    p.content,
    p.links,
    p.status,
    p.created_at,
    p.is_notification_seen,
    COALESCE(
      CASE
        WHEN p.type = 'comment_check' THEN cc.visible_count
        WHEN p.type = 'post_approval' THEN sg.approved_count
      END, 0
    ) AS visible_count,
    COALESCE(
      CASE
        WHEN p.type = 'comment_check' THEN cc.total_count
        WHEN p.type = 'post_approval' THEN sg.total_count
      END, 0
    ) AS total_count
  FROM public.seeding_posts p
  LEFT JOIN (
    SELECT
      sc.post_id,
      COUNT(sc.id) AS total_count,
      COUNT(sc.id) FILTER (WHERE sc.status = 'visible') AS visible_count
    FROM public.seeding_comments sc
    GROUP BY sc.post_id
  ) cc ON p.id = cc.post_id AND p.type = 'comment_check'
  LEFT JOIN (
    SELECT
      sgr.post_id,
      COUNT(sgr.id) AS total_count,
      COUNT(sgr.id) FILTER (WHERE sgr.status = 'approved') AS approved_count
    FROM public.seeding_groups sgr
    GROUP BY sgr.post_id
  ) sg ON p.id = sg.post_id AND p.type = 'post_approval'
  WHERE p.project_id = p_project_id
  ORDER BY p.created_at;
END;
$function$;