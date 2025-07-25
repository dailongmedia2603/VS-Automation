-- Drop functions first to remove dependencies
DROP FUNCTION IF EXISTS public.get_zalo_conversations();

-- Drop tables with CASCADE to handle foreign keys and other dependencies
DROP TABLE IF EXISTS public.zalo_ai_reply_logs CASCADE;
DROP TABLE IF EXISTS public.zalo_auto_reply_settings CASCADE;
DROP TABLE IF EXISTS public.zalo_care_scripts CASCADE;
DROP TABLE IF EXISTS public.zalo_care_settings CASCADE;
DROP TABLE IF EXISTS public.zalo_conversation_labels CASCADE;
DROP TABLE IF EXISTS public.zalo_conversation_seen_status CASCADE;
DROP TABLE IF EXISTS public.zalo_labels CASCADE;
DROP TABLE IF EXISTS public.zalo_messages CASCADE;
DROP TABLE IF EXISTS public.zalo_notes CASCADE;
DROP TABLE IF EXISTS public.zalo_user CASCADE;

DROP TABLE IF EXISTS public.ai_reply_logs CASCADE;
DROP TABLE IF EXISTS public.ai_typing_status CASCADE;
DROP TABLE IF EXISTS public.auto_reply_settings CASCADE;
DROP TABLE IF EXISTS public.care_script_settings CASCADE;
DROP TABLE IF EXISTS public.care_scripts CASCADE;
DROP TABLE IF EXISTS public.chatwoot_labels CASCADE;
DROP TABLE IF EXISTS public.chatwoot_settings CASCADE;
DROP TABLE IF EXISTS public.chatwoot_attachments CASCADE;
DROP TABLE IF EXISTS public.chatwoot_contacts CASCADE;
DROP TABLE IF EXISTS public.chatwoot_conversation_labels CASCADE;
DROP TABLE IF EXISTS public.chatwoot_conversations CASCADE;
DROP TABLE IF EXISTS public.chatwoot_messages CASCADE;