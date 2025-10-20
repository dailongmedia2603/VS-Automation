ALTER TABLE public.ai_settings
ADD COLUMN IF NOT EXISTS embedding_model_name TEXT;