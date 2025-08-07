-- Create or update a cron job to run the 'cron-scheduler' function every minute.
-- This will trigger all necessary automated tasks in the system.
SELECT cron.schedule(
  'run-all-tasks-every-minute',
  '*/1 * * * *', -- This is the cron expression for "every minute"
  $$
    SELECT net.http_post(
      url:='https://gvodhpoqnngefmyxdmeh.supabase.co/functions/v1/cron-scheduler',
      headers:='{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b2RocG9xbm5nZWZteXhkbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTEzMDYsImV4cCI6MjA2OTA4NzMwNn0._KGBw48fHYFX_uOUXqSx4jnS7oHTzJ64-PP2o_vaO9M"}'
    )
  $$
);