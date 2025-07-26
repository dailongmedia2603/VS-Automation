ALTER TABLE public.apifb_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage apifb_settings" ON public.apifb_settings;

CREATE POLICY "Allow authenticated users to manage apifb_settings" ON public.apifb_settings
FOR ALL
USING (auth.role() = 'authenticated'::text)
WITH CHECK (auth.role() = 'authenticated'::text);