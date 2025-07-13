-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to the postgres user for security
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;

-- --- Scheduler for SENDING messages (every minute) ---
-- Safely remove old job
DO $$ BEGIN IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-care-script-scheduler') THEN PERFORM cron.unschedule('run-care-script-scheduler'); END IF; END; $$;
-- Schedule new job
SELECT cron.schedule( 'run-care-script-scheduler', '* * * * *', $$ SELECT net.http_post( url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/care-script-scheduler', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2dvc3NvbmlraXFiYWtnZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjMsImV4cCI6MjA2NzM5ODM2M30.kxVLC6IaU4GoGfmMwqWDtxtnHSM5r4mZqZ-IcObrKgA"}'::jsonb, body:='{}'::jsonb ) $$ );

-- --- Automation for CREATING scripts (every 5 minutes) ---
-- Safely remove old job
DO $$ BEGIN IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-ai-care-automation') THEN PERFORM cron.unschedule('run-ai-care-automation'); END IF; END; $$;
-- Schedule new job
SELECT cron.schedule( 'run-ai-care-automation', '*/5 * * * *', $$ SELECT net.http_post( url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/ai-care-script-automation', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2dvc3NvbmlraXFiYWtnZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjMsImV4cCI6MjA2NzM5ODM2M30.kxVLC6IaU4GoGfmMwqWDtxtnHSM5r4mZqZ-IcObrKgA"}'::jsonb, body:='{}'::jsonb ) $$ );