ALTER TABLE public.ai_settings
ADD COLUMN IF NOT EXISTS openai_api_url TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS openai_embedding_model TEXT;