CREATE TABLE public.care_scripts (
  id SERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES public.chatwoot_conversations(id) ON DELETE CASCADE NOT NULL,
  contact_id BIGINT REFERENCES public.chatwoot_contacts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- Các trạng thái: 'scheduled', 'sent', 'failed'
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.care_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for care_scripts" ON public.care_scripts FOR ALL USING (true) WITH CHECK (true);