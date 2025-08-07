-- Xóa các lịch trình cũ và bị trùng lặp để dọn dẹp
SELECT cron.unschedule('every-minute-scheduler');
SELECT cron.unschedule('invoke-cron-scheduler-every-minute');

-- Tạo lại một lịch trình duy nhất, sạch sẽ
SELECT cron.schedule(
  'invoke-cron-scheduler', -- Tên mới, rõ ràng
  '* * * * *', -- Chạy mỗi phút
  $$
  SELECT net.http_post(
    url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b2RocG9xbm5nZWZteXhkbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTEzMDYsImV4cCI6MjA2OTA4NzMwNn0._KGBw48fHYFX_uOUXqSx4jnS7oHTzJ64-PP2o_vaO9M"}'
  )
  $$
);