-- Xóa lịch trình cũ bị lỗi để tránh xung đột
SELECT cron.unschedule('invoke-cron-scheduler-every-minute');

-- Kích hoạt các extension cần thiết (để đảm bảo)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Lập lịch lại để gọi Edge Function 'cron-scheduler' mỗi phút với ANON KEY (public key)
SELECT cron.schedule(
  'invoke-cron-scheduler-every-minute',
  '* * * * *', -- Chạy mỗi phút
  $$
  SELECT net.http_post(
    url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b2RocG9xbm5nZWZteXhkbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTEzMDYsImV4cCI6MjA2OTA4NzMwNn0._KGBw48fHYFX_uOUXqSx4jnS7oHTzJ64-PP2o_vaO9M"}'
  )
  $$
);