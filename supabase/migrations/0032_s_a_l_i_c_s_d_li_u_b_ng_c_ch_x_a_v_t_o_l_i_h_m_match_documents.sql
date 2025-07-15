-- Add new columns to the documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS example_customer_message TEXT,
ADD COLUMN IF NOT EXISTS example_agent_reply TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Backfill created_at for existing rows
UPDATE public.documents SET created_at = NOW() WHERE created_at IS NULL;

-- Set default and NOT NULL constraint for created_at
ALTER TABLE public.documents ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.documents ALTER COLUMN created_at SET NOT NULL;

-- Update RLS policies for full access by authenticated users for now
DROP POLICY IF EXISTS "Allow public read access" ON public.documents;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.documents;

CREATE POLICY "Authenticated users can manage documents"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop the existing function before recreating it with a new return type
DROP FUNCTION IF EXISTS public.match_documents(vector, double precision, integer);

-- Update the match_documents function to return title
CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding vector,
    match_threshold double precision,
    match_count integer
)
RETURNS TABLE(id bigint, title text, content text, similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM public.documents d
  WHERE d.embedding IS NOT NULL AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;