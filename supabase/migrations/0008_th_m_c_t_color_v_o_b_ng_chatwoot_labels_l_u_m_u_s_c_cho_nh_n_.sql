ALTER TABLE public.chatwoot_labels
ADD COLUMN color TEXT DEFAULT '#6B7280';

ALTER TABLE public.chatwoot_labels
ALTER COLUMN color SET NOT NULL;