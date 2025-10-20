ALTER TABLE public.ai_reply_logs
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

DROP FUNCTION IF EXISTS public.match_documents(vector, double precision, integer);

CREATE FUNCTION public.match_documents(
  query_embedding vector,
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  embedding vector,
  title text,
  purpose text,
  document_type text,
  creator_name text,
  example_customer_message text,
  example_agent_reply text,
  created_at timestamp with time zone,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    d.embedding,
    d.title,
    d.purpose,
    d.document_type,
    d.creator_name,
    d.example_customer_message,
    d.example_agent_reply,
    d.created_at,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM public.documents d
  WHERE d.embedding IS NOT NULL AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;