CREATE TABLE IF NOT EXISTS public.facebook_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  api_url TEXT,
  access_token TEXT,
  CONSTRAINT facebook_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.facebook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage Facebook settings"
ON public.facebook_settings
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);