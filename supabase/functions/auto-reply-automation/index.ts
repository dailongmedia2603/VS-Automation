// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL_NAME = 'AI Star';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if auto-reply is enabled
    const { data: autoReplySettings, error: settingsError } = await supabaseAdmin
      .from('auto_reply_settings').select('config').eq('id', 1).single();
    if (settingsError || !autoReplySettings || !autoReplySettings.config?.enabled) {
      return new Response(JSON.stringify({ message: "Auto-reply is disabled. Skipping." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 2. Get 'AI Star' label ID
    const { data: labelData, error: labelError } = await supabaseAdmin
      .from('chatwoot_labels').select('id').eq('name', AI_STAR_LABEL_NAME).single();
    if (labelError || !labelData) {
      console.log(`Label '${AI_STAR_LABEL_NAME}' not found. Skipping.`);
      return new Response(JSON.stringify({ message: `Label '${AI_STAR_LABEL_NAME}' not found.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    const aiStarLabelId = labelData.id;

    // 3. Find unread conversations with the 'AI Star' label
    const { data: convLabelData, error: convLabelError } = await supabaseAdmin
      .from('chatwoot_conversation_labels').select('conversation_id').eq('label_id', aiStarLabelId);
    if (convLabelError) throw convLabelError;
    if (!convLabelData || convLabelData.length === 0) {
      return new Response(JSON.stringify({ message: "No conversations with AI Star label." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    const taggedConvIds = convLabelData.map(item => item.conversation_id);

    const { data: unreadConvos, error: unreadConvosError } = await supabaseAdmin
      .from('chatwoot_conversations').select('id')
      .in('id', taggedConvIds).gt('unread_count', 0);
    if (unreadConvosError) throw unreadConvosError;
    if (!unreadConvos || unreadConvos.length === 0) {
      return new Response(JSON.stringify({ message: "No unread conversations to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 4. Trigger worker for each conversation
    for (const convo of unreadConvos) {
      try {
        // We don't await this, to allow them to run in parallel
        supabaseAdmin.functions.invoke('auto-reply-worker', {
          body: { conversationId: convo.id },
        });
      } catch (e) {
        console.error(`Failed to invoke worker for convo ${convo.id}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Triggered workers for ${unreadConvos.length} conversations.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in auto-reply automation:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});