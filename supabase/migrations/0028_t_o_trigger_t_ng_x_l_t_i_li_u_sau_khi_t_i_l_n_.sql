-- Create a function to be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Invoke the Edge Function with the bucket and path of the new file
  PERFORM net.http_post(
    url:='https://ytsgossonikiqbakgdmi.supabase.co/functions/v1/process-document',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0c2dvc3NvbmlraXFiYWtnZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjMsImV4cCI6MjA2NzM5ODM2M30.kxVLC6IaU4GoGfmMwqWDtxtnHSM5r4mZqZ-IcObrKgA"}',
    body:=jsonb_build_object('bucket', new.bucket_id, 'path', new.name)
  );
  RETURN new;
END;
$$;

-- Create a trigger that fires after a new object is inserted into the specified bucket
CREATE TRIGGER on_document_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (new.bucket_id = 'document-uploads')
  EXECUTE PROCEDURE public.handle_new_document();