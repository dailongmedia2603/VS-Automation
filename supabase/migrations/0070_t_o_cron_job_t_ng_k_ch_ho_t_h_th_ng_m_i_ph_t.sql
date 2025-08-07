-- Kích hoạt extension pg_net nếu chưa có
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Lập lịch để gọi Edge Function 'cron-scheduler' mỗi phút
SELECT cron.schedule(
  'invoke-cron-scheduler-every-minute',
  '* * * * *', -- Chạy mỗi phút
  $$
  SELECT net.http_post(
    url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b2RocG9xbm5nZWZteXhkbWVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxMTMwNiwiZXhwIjoyMDY5MDg3MzA2fQ.0_32BF53oA3z-O210-p2J22A52AF5Y245f535455"}'
  )
  $$
);