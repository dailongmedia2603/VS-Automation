CREATE POLICY "Allow public read on ai_plan_templates"
ON public.ai_plan_templates
FOR SELECT
USING (true);