SELECT cron.schedule(
  'care-script-scheduler-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/care-script-scheduler',
    headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2dvc3NvbmlraXFiYWtnZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjMsImV4cCI6MjA2NzM5ODM2M30.kxVLC6IaU4GoGfmMwqWDtxtnHSM5r4mZqZ-IcObrKgA"}'::jsonb
  )
  $$
);