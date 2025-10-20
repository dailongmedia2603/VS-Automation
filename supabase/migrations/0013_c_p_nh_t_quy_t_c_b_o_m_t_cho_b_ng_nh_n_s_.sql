DROP POLICY "Allow authenticated users to manage staff" ON public.staff;
CREATE POLICY "Public access for staff management" ON public.staff FOR ALL USING (true) WITH CHECK (true);