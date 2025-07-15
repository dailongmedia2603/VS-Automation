-- Drop all existing policies on the documents table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow authenticated users to read all documents" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated users to update all documents" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete all documents" ON public.documents;
DROP POLICY IF EXISTS "Public access for documents" ON public.documents;

-- Create a new, completely public policy for all actions.
-- This allows anyone, authenticated or not, to perform any action.
CREATE POLICY "Public access for documents"
ON public.documents
FOR ALL
USING (true)
WITH CHECK (true);