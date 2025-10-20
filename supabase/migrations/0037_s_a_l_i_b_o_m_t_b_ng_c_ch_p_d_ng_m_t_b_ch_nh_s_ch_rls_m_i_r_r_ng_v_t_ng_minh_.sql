-- Drop the old, general policy to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;

-- Create a new, permissive SELECT policy for authenticated users
CREATE POLICY "Allow authenticated users to read all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Create a new, permissive INSERT policy for authenticated users
CREATE POLICY "Allow authenticated users to insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create a new, permissive UPDATE policy for authenticated users
CREATE POLICY "Allow authenticated users to update all documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (true);

-- Create a new, permissive DELETE policy for authenticated users
CREATE POLICY "Allow authenticated users to delete all documents"
ON public.documents
FOR DELETE
TO authenticated
USING (true);