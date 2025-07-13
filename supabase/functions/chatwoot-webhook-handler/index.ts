// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const event = payload.event;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (event === 'message_created' || event === 'message_updated') {
        const message = payload;
        const conversation = payload.conversation;
        const contact = conversation.meta.sender;

        await supabaseAdmin.from('chatwoot_contacts').upsert({
            id: contact.id,
            name: contact.name,
            email: contact.email,
            phone_number: contact.phone_number,
            thumbnail_url: contact.thumbnail,
        }, { onConflict: 'id' });

        await supabaseAdmin.from('chatwoot_conversations').upsert({
            id: conversation.id,
            contact_id: contact.id,
            status: conversation.status,
            last_activity_at: new Date(conversation.last_activity_at * 1000).toISOString(),
            unread_count: message.message_type === 0 ? conversation.unread_count : 0,
        }, { onConflict: 'id' });

        await supabaseAdmin.from('chatwoot_messages').upsert({
            id: message.id,
            conversation_id: message.conversation_id,
            content: message.content,
            message_type: message.message_type,
            is_private: message.private,
            sender_name: message.sender?.name,
            sender_thumbnail: message.sender?.thumbnail,
            created_at_chatwoot: new Date(message.created_at * 1000).toISOString(),
        }, { onConflict: 'id' });
        
        if (message.attachments && message.attachments.length > 0) {
            const attachmentsToUpsert = message.attachments.map(a => ({
                id: a.id,
                message_id: message.id,
                file_type: a.file_type,
                data_url: a.data_url,
            }));
            await supabaseAdmin.from('chatwoot_attachments').upsert(attachmentsToUpsert, { onConflict: 'id' });
        }
    } else if (event === 'conversation_status_changed') {
        const conversation = payload;
        await supabaseAdmin.from('chatwoot_conversations')
            .update({ status: conversation.status })
            .eq('id', conversation.id);
    } else if (event === 'conversation_updated') {
        const conversation = payload;
        const labels = payload.labels || [];
        
        await supabaseAdmin.from('chatwoot_conversation_labels')
            .delete()
            .eq('conversation_id', conversation.id);

        if (labels.length > 0) {
            const { data: labelData } = await supabaseAdmin
                .from('chatwoot_labels')
                .select('id, name')
                .in('name', labels);
            
            if (labelData) {
                const conversationLabelsToInsert = labelData.map(l => ({
                    conversation_id: conversation.id,
                    label_id: l.id
                }));
                await supabaseAdmin.from('chatwoot_conversation_labels').insert(conversationLabelsToInsert);
            }
        }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in chatwoot-webhook-handler:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})