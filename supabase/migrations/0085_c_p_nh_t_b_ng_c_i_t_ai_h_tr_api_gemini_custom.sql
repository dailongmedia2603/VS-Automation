ALTER TABLE public.ai_settings
ADD COLUMN IF NOT EXISTS custom_gemini_api_url TEXT,
ADD COLUMN IF NOT EXISTS custom_gemini_api_key TEXT;