-- Xóa bỏ trigger tự động xử lý file
DROP TRIGGER IF EXISTS on_document_upload ON storage.objects;

-- Xóa bỏ function được gọi bởi trigger
DROP FUNCTION IF EXISTS public.handle_new_document();