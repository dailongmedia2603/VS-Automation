-- Bảng 1: contacts (Lưu thông tin khách hàng)
CREATE TABLE public.chatwoot_contacts (
  id BIGINT PRIMARY KEY, -- ID từ Chatwoot
  name TEXT,
  email TEXT,
  phone_number TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.chatwoot_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_contacts" ON public.chatwoot_contacts FOR ALL USING (true) WITH CHECK (true);

-- Bảng 2: conversations (Lưu các cuộc trò chuyện)
CREATE TABLE public.chatwoot_conversations (
  id BIGINT PRIMARY KEY, -- ID từ Chatwoot
  contact_id BIGINT REFERENCES public.chatwoot_contacts(id) ON DELETE CASCADE,
  status TEXT,
  last_activity_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.chatwoot_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_conversations" ON public.chatwoot_conversations FOR ALL USING (true) WITH CHECK (true);

-- Bảng 3: messages (Lưu các tin nhắn)
CREATE TABLE public.chatwoot_messages (
  id BIGINT PRIMARY KEY, -- ID từ Chatwoot
  conversation_id BIGINT REFERENCES public.chatwoot_conversations(id) ON DELETE CASCADE,
  content TEXT,
  message_type INT, -- 0: incoming, 1: outgoing, 2: activity
  is_private BOOLEAN DEFAULT false,
  sender_name TEXT,
  sender_thumbnail TEXT,
  created_at_chatwoot TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.chatwoot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_messages" ON public.chatwoot_messages FOR ALL USING (true) WITH CHECK (true);

-- Bảng 4: attachments (Lưu các tệp đính kèm)
CREATE TABLE public.chatwoot_attachments (
  id BIGINT PRIMARY KEY, -- ID từ Chatwoot
  message_id BIGINT REFERENCES public.chatwoot_messages(id) ON DELETE CASCADE,
  file_type TEXT,
  data_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.chatwoot_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_attachments" ON public.chatwoot_attachments FOR ALL USING (true) WITH CHECK (true);

-- Bảng 5: labels (Lưu các thẻ)
CREATE TABLE public.chatwoot_labels (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.chatwoot_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_labels" ON public.chatwoot_labels FOR ALL USING (true) WITH CHECK (true);

-- Bảng 6: conversation_labels (Bảng nối)
CREATE TABLE public.chatwoot_conversation_labels (
  conversation_id BIGINT REFERENCES public.chatwoot_conversations(id) ON DELETE CASCADE,
  label_id INT REFERENCES public.chatwoot_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);
ALTER TABLE public.chatwoot_conversation_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access for chatwoot_conversation_labels" ON public.chatwoot_conversation_labels FOR ALL USING (true) WITH CHECK (true);

-- Function to update 'updated_at' columns automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for 'updated_at'
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.chatwoot_contacts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.chatwoot_conversations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();