-- Enable extensions for scheduling and network requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to the postgres user for security
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;

-- Safely remove any old cron job to avoid duplicates
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-care-script-scheduler') THEN
      PERFORM cron.unschedule('run-care-script-scheduler');
   END IF;
END;
$$;

-- Schedule a new cron job to run every minute
-- This job calls the care-script-scheduler Edge Function to send due messages
SELECT cron.schedule(
    'run-care-script-scheduler',
    '* * * * *', -- Run every minute
    $$
    SELECT
      net.http_post(
        url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/care-script-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2dvc3NvbmlraXFiYWtnZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjMsImV4cCI6MjA2NzM5ODM2M30.kxVLC6IaU4GoGfmMwqWDtxtnHSM5r4mZqZ-IcObrKgA"}'::jsonb,
        body:='{}'::jsonb
      )
    $$
);