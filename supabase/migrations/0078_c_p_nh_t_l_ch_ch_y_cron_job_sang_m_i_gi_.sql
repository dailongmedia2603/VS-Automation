-- Hủy lịch trình cũ (chạy mỗi phút)
SELECT cron.unschedule('invoke-cron-scheduler');

-- Đặt lịch trình mới (chạy vào phút thứ 0 của mỗi giờ)
SELECT cron.schedule(
  'invoke-cron-scheduler',
  '0 * * * *',
  $$
    SELECT net.http_post(
        url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b2RocG9xbm5nZWZteXhkbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTEzMDYsImV4cCI6MjA2OTA4NzMwNn0._KGBw48fHYFX_uOUXqSx4jnS7oHTzJ64-PP2o_vaO9M"}'
    ) AS request_id;
  $$
);