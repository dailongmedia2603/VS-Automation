CREATE POLICY "Allow delete for authenticated users"
ON public.ai_reply_logs FOR DELETE
USING (auth.role() = 'authenticated');