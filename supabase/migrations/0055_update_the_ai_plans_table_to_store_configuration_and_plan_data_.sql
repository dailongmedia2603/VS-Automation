-- Add columns for config and plan data
ALTER TABLE public.ai_plans ADD COLUMN IF NOT EXISTS config JSONB;
ALTER TABLE public.ai_plans ADD COLUMN IF NOT EXISTS plan_data JSONB;