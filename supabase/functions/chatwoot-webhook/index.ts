// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function handleMessageCreated(supabase: SupabaseClient, payload: any) {
  const message = payload;
  const conversation = payload.conversation;
  const contact = payload.sender;

  // Sync Contact
  if (contact && contact.type === 'contact') {
    await supabase.from('chatwoot_contacts').upsert({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone_number: contact.phone_number,
      thumbnail_url: contact.thumbnail,
    }, { onConflict: 'id' });
  }

  // Sync Conversation on new message
  if (conversation) {
    await supabase.from('chatwoot_conversations').upsert({
      id: conversation.id,
      contact_id: contact?.id,
      status: conversation.status,
      last_activity_at: conversation.last_activity_at,
      unread_count: conversation.unread_count,
    }, { onConflict: 'id' });
  }

  // Sync Message
  await supabase.from('chatwoot_messages').upsert({
    id: message.id,
    conversation_id: conversation.id,
    content: message.content,
    message_type: message.message_type === 'incoming' ? 0 : 1,
    is_private: message.private,
    sender_name: contact?.name,
    sender_thumbnail: contact?.thumbnail,
    created_at_chatwoot: message.created_at,
  }, { onConflict: 'id' });

  // Sync Attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachmentsToUpsert = message.attachments.map((att: any) => ({
      id: att.id,
      message_id: message.id,
      file_type: att.file_type,
      data_url: att.data_url,
    }));
    await supabase.from('chatwoot_attachments').upsert(attachmentsToUpsert, { onConflict: 'id' });
  }
}

async function handleConversationUpdated(supabase: SupabaseClient, payload: any) {
    const conversation = payload;
    await supabase
      .from('chatwoot_conversations')
      .update({ 
          unread_count: conversation.unread_count,
          status: conversation.status,
          last_activity_at: conversation.last_activity_at,
      })
      .eq('id', conversation.id);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json()
    const event = payload.event;

    switch (event) {
      case 'message_created':
      case 'message_updated':
        await handleMessageCreated(supabaseAdmin, payload);
        break;
      case 'conversation_updated':
        await handleConversationUpdated(supabaseAdmin, payload);
        break;
      default:
        // Do nothing for other events
        break;
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in Chatwoot webhook handler:', error.message, error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})