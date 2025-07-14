-- 1. Enable the pgvector extension if it's not already enabled
create extension if not exists vector;

-- 2. Create a table to store your document chunks and their vector embeddings
create table documents (
  id bigserial primary key,
  content text, -- The text chunk from the document
  metadata jsonb, -- To store original file name, etc.
  embedding vector(1536) -- Corresponds to OpenAI's text-embedding-3-small model
);

-- 3. Create a function to search for similar document chunks
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- 4. Enable Row Level Security and set policies for the new table
alter table documents enable row level security;
create policy "Allow public read access" on documents for select using (true);
create policy "Allow insert for authenticated users" on documents for insert with check (auth.role() = 'authenticated');
create policy "Allow delete for authenticated users" on documents for delete using (auth.role() = 'authenticated');