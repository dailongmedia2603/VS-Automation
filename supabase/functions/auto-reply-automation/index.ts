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

    // 2. Get Chatwoot settings
    const { data: chatwootSettings, error: chatwootSettingsError } = await supabaseAdmin
      .from('chatwoot_settings').select('*').eq('id', 1).single();
    if (chatwootSettingsError || !chatwootSettings) {
        console.warn("Chatwoot settings not found. Skipping automation.");
        return new Response(JSON.stringify({ message: "Chatwoot settings not found." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
    }

    // 3. Get AI Star label ID
    const { data: aiStarLabel, error: labelError } = await supabaseAdmin
      .from('chatwoot_labels')
      .select('id')
      .eq('name', AI_STAR_LABEL_NAME)
      .single();

    if (labelError || !aiStarLabel) {
      console.warn(`Label '${AI_STAR_LABEL_NAME}' not found. Skipping auto-tagging.`);
    }

    // 4. Get live conversations from Chatwoot
    const { data: chatwootData, error: functionError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_conversations', settings: chatwootSettings },
    });

    if (functionError) {
        throw new Error(`Error fetching conversations from Chatwoot: ${(await functionError.context.json()).error || functionError.message}`);
    }
    if (chatwootData.error) {
        throw new Error(`Error from Chatwoot proxy: ${chatwootData.error}`);
    }

    let allConversations = chatwootData.data.payload || [];

    // 5. Auto-tag new unread conversations with 'AI Star' if the label exists
    if (aiStarLabel) {
      const conversationsToTag = allConversations.filter(convo => 
        convo.unread_count > 0 && !convo.labels.includes(AI_STAR_LABEL_NAME)
      );

      if (conversationsToTag.length > 0) {
        console.log(`Found ${conversationsToTag.length} new conversations to tag with '${AI_STAR_LABEL_NAME}'.`);
        await Promise.all(
          conversationsToTag.map(async (convo) => {
            try {
              const newLabels = [...convo.labels, AI_STAR_LABEL_NAME];
              await supabaseAdmin.functions.invoke('chatwoot-proxy', {
                body: { action: 'update_labels', settings: chatwootSettings, conversationId: convo.id, labels: newLabels },
              });
              await supabaseAdmin.from('chatwoot_conversation_labels').upsert({ conversation_id: convo.id, label_id: aiStarLabel.id });
              console.log(`Tagged conversation #${convo.id}`);
            } catch (tagError) {
              console.error(`Failed to tag conversation #${convo.id}:`, tagError.message);
            }
          })
        );
        // Refresh conversation list to get updated labels
        const { data: refreshedChatwootData } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
            body: { action: 'list_conversations', settings: chatwootSettings },
        });
        if (refreshedChatwootData && refreshedChatwootData.data.payload) {
            allConversations = refreshedChatwootData.data.payload;
        }
      }
    }

    // 6. Filter conversations to be processed by the worker
    const conversationsToProcess = allConversations.filter(convo => 
        convo.unread_count > 0 && convo.labels.includes(AI_STAR_LABEL_NAME)
    );

    if (conversationsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "No unread conversations with AI Star tag to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 7. Trigger AI worker for each valid conversation
    for (const convo of conversationsToProcess) {
      try {
        // No `await` to allow workers to run in parallel
        supabaseAdmin.functions.invoke('auto-reply-worker', {
          body: { conversationId: convo.id },
        });
      } catch (e) {
        console.error(`Failed to trigger worker for conversation ${convo.id}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Triggered worker for ${conversationsToProcess.length} conversations.` }), {
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