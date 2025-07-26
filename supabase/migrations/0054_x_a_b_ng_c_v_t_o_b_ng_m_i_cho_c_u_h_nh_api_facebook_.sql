DROP TABLE IF EXISTS public.facebook_settings;

CREATE TABLE public.api_fb (
  id BIGINT PRIMARY KEY DEFAULT 1,
  url TEXT,
  access_token TEXT,
  CONSTRAINT api_fb_singleton CHECK (id = 1)
);

ALTER TABLE public.api_fb ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage API_FB settings"
ON public.api_fb
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);