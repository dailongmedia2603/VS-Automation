-- Step 1: Create a new permission for editing training/prompt configurations if it doesn't exist.
INSERT INTO public.permissions (action, description)
VALUES ('edit_training_chatbot', 'Quyền chỉnh sửa trong mục Setup Prompt (Thư viện Prompt, Điều kiện, Cấu trúc)')
ON CONFLICT (action) DO NOTHING;

-- Step 2: Grant this new permission to the 'Member' role if the relationship doesn't exist.
-- This allows staff members to edit these resources.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
  roles.id,
  permissions.id
FROM public.roles, public.permissions
WHERE roles.name = 'Member' AND permissions.action = 'edit_training_chatbot'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Step 3: Update RLS policies for all relevant tables to include the new permission.

-- For prompt_libraries
ALTER POLICY "Allow update for creator or super admin" ON public.prompt_libraries
USING (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)))
WITH CHECK (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)));

-- For condition_libraries
ALTER POLICY "Users can update their own condition libraries" ON public.condition_libraries
USING (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)))
WITH CHECK (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)));

-- For article_structure_libraries
ALTER POLICY "Users can update their own libraries" ON public.article_structure_libraries
USING (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)))
WITH CHECK (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)));

-- For article_structures
ALTER POLICY "Users can update their own article structures" ON public.article_structures
USING (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)))
WITH CHECK (((auth.uid() = creator_id) OR is_super_admin() OR has_permission('edit_training_chatbot'::text)));