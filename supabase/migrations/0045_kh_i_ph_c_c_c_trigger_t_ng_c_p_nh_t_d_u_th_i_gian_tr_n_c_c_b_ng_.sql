DROP TRIGGER IF EXISTS set_timestamp ON public.ai_training_prompts;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.ai_training_prompts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.chatwoot_conversations;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.chatwoot_conversations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.chatwoot_contacts;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.chatwoot_contacts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.ai_typing_status;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.ai_typing_status
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_care_script ON public.care_script_settings;
CREATE TRIGGER set_timestamp_care_script
BEFORE UPDATE ON public.care_script_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_auto_reply ON public.auto_reply_settings;
CREATE TRIGGER set_timestamp_auto_reply
BEFORE UPDATE ON public.auto_reply_settings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();