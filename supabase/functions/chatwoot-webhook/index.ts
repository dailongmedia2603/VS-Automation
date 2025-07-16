// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to safely create a Date object and convert to ISO string
const toISOStringSafe = (timestamp: number | undefined | null): string => {
  if (typeof timestamp === 'number' && !isNaN(timestamp)) {
    return new Date(timestamp * 1000).toISOString();
  }
  return new Date().toISOString();
};

async function handleMessageCreated(supabase: SupabaseClient, payload: any) {
  const message = payload;
  const conversation = payload.conversation;
  const contact = payload.sender;

  const promises = [];

  // 1. Sync Contact
  if (contact && contact.type === 'contact') {
    promises.push(
      supabase.from('chatwoot_contacts').upsert({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone_number: contact.phone_number,
        thumbnail_url: contact.thumbnail,
      }, { onConflict: 'id' }).then(res => ({ ...res, source: 'contact' }))
    );
  }

  // 2. Sync Conversation
  if (conversation) {
    const conversationData = {
      id: conversation.id,
      contact_id: contact?.id,
      status: conversation.status,
      last_activity_at: toISOStringSafe(conversation.last_activity_at),
      unread_count: conversation.unread_count,
    };
    promises.push(
      supabase.from('chatwoot_conversations').upsert(conversationData, { onConflict: 'id' }).then(res => ({ ...res, source: 'conversation' }))
    );
  }

  // 3. Sync Message
  const messageData = {
    id: message.id,
    conversation_id: conversation.id,
    content: message.content,
    message_type: message.message_type === 'incoming' ? 0 : 1,
    is_private: message.private,
    sender_name: contact?.name,
    sender_thumbnail: contact?.thumbnail,
    created_at_chatwoot: toISOStringSafe(message.created_at),
  };
  promises.push(
    supabase.from('chatwoot_messages').upsert(messageData, { onConflict: 'id' }).then(res => ({ ...res, source: 'message' }))
  );

  // 4. Sync Attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachmentsToUpsert = message.attachments.map((att: any) => ({
      id: att.id,
      message_id: message.id,
      file_type: att.file_type,
      data_url: att.data_url,
    }));
    promises.push(
      supabase.from('chatwoot_attachments').upsert(attachmentsToUpsert, { onConflict: 'id' }).then(res => ({ ...res, source: 'attachments' }))
    );
  }

  // Execute all promises and log any individual failures
  const results = await Promise.allSettled(promises);
  results.forEach(result => {
    if (result.status === 'rejected') {
      console.error(`Webhook sub-task failed:`, result.reason);
    } else if (result.value.error) {
      console.error(`Error upserting ${result.value.source}:`, result.value.error);
    }
  });
}

async function handleConversationUpdated(supabase: SupabaseClient, payload: any) {
    const conversation = payload;
    const { error } = await supabase
      .from('chatwoot_conversations')
      .update({ 
          unread_count: conversation.unread_count,
          status: conversation.status,
          last_activity_at: toISOStringSafe(conversation.last_activity_at),
      })
      .eq('id', conversation.id);
    
    if (error) {
        console.error('Error updating conversation:', error);
    }
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

    const payload = await req.json();
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
        // Do nothing for other events, but log them for debugging
        console.log(`Received unhandled event: ${event}`);
        break;
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Critical error in Chatwoot webhook handler:', error.message, error.stack)
    return new Response(JSON.stringify({ error: `Critical handler error: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})