INSERT INTO public.chatwoot_labels (name, color)
VALUES ('AI Star', '#FFD700')
ON CONFLICT (name) DO NOTHING;