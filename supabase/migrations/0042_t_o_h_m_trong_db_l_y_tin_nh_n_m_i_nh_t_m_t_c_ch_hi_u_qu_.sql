create or replace function public.get_latest_messages(convo_ids bigint[])
returns table (
  conversation_id bigint,
  content text,
  message_type int,
  created_at_chatwoot timestamptz
)
language sql
as $$
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.content,
    m.message_type,
    m.created_at_chatwoot
  from public.chatwoot_messages m
  where m.conversation_id = any(convo_ids)
    and m.message_type in (0, 1)
  order by m.conversation_id, m.created_at_chatwoot desc;
$$;