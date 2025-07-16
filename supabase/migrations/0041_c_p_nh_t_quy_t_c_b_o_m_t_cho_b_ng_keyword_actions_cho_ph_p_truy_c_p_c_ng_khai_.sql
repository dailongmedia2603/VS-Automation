DROP POLICY "Allow all access for authenticated users" ON public.keyword_actions;

CREATE POLICY "Public access for keyword_actions"
ON public.keyword_actions
FOR ALL
USING (true)
WITH CHECK (true);