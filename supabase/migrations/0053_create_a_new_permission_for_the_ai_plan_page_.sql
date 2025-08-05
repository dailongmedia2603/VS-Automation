INSERT INTO public.permissions (action, description)
VALUES ('view_ai_plan', 'View AI Plan page')
ON CONFLICT (action) DO NOTHING;