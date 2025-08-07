-- Xóa lịch trình cũ bị lỗi để tránh xung đột
SELECT cron.unschedule('invoke-cron-scheduler-every-minute');

-- Kích hoạt các extension cần thiết (để đảm bảo)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Lập lịch lại để gọi Edge Function 'cron-scheduler' mỗi phút với key ĐÚNG
SELECT cron.schedule(
  'invoke-cron-scheduler-every-minute',
  '* * * * *', -- Chạy mỗi phút
  $$
  SELECT net.http_post(
    url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'
  )
  $$
);