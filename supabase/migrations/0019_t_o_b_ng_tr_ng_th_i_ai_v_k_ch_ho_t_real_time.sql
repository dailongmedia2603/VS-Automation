-- Create the table to store AI typing status
CREATE TABLE public.ai_typing_status (
  conversation_id BIGINT NOT NULL PRIMARY KEY REFERENCES public.chatwoot_conversations(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_typing_status ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public access
CREATE POLICY "Public access for ai_typing_status" ON public.ai_typing_status FOR ALL USING (true) WITH CHECK (true);

-- Create a trigger to automatically update the 'updated_at' timestamp
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.ai_typing_status
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

-- Add the new table to the Supabase realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_typing_status;