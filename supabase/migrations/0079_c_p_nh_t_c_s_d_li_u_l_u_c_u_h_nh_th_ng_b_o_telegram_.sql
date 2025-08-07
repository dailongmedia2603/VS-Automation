ALTER TABLE public.n8n_settings
ADD COLUMN IF NOT EXISTS telegram_config_id_for_seeding BIGINT REFERENCES public.telegram_configs(id) ON DELETE SET NULL;