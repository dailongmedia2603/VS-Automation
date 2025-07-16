SELECT cron.schedule(
  'keep-chatwoot-webhook-warm',
  '* * * * *', -- Chạy mỗi phút
  $$
    SELECT net.http_post(
      url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/chatwoot-webhook',
      headers:='{"Content-Type": "application/json"}',
      body:='{"event": "ping"}'
    )
  $$
);