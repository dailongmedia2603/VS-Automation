ALTER TABLE public.ai_settings
ADD COLUMN openai_api_url TEXT,
ADD COLUMN openai_api_key TEXT,
ADD COLUMN openai_embedding_model TEXT;