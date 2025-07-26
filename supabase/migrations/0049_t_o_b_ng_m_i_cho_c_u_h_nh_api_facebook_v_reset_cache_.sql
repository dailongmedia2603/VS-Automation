-- Drop old tables if they exist to ensure a clean state
DROP TABLE IF EXISTS public.api_fb;
DROP TABLE IF EXISTS public.facebook_settings;

-- Create the new table for Facebook API settings, similar to ai_settings
CREATE TABLE public.facebook_api_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_api_settings_singleton CHECK (id = 1)
);

-- Enable Row Level Security
ALTER TABLE public.facebook_api_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to manage the settings
CREATE POLICY "Allow authenticated users to manage Facebook API settings"
ON public.facebook_api_settings
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);

-- Notify PostgREST to reload schema cache to avoid "relation does not exist" errors
NOTIFY pgrst, 'reload schema';