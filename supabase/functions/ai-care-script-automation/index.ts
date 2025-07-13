// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_CARE_LABEL_NAME = 'AI chăm';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Find the ID of the 'AI chăm' label
    const { data: labelData, error: labelError } = await supabaseAdmin
      .from('chatwoot_labels')
      .select('id')
      .eq('name', AI_CARE_LABEL_NAME)
      .single();

    if (labelError || !labelData) {
      console.log(`Label '${AI_CARE_LABEL_NAME}' not found. Skipping automation.`);
      return new Response(JSON.stringify({ message: `Label '${AI_CARE_LABEL_NAME}' not found.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const aiCareLabelId = labelData.id;

    // 2. Find all conversations with this label
    const { data: convLabelData, error: convLabelError } = await supabaseAdmin
      .from('chatwoot_conversation_labels')
      .select('conversation_id')
      .eq('label_id', aiCareLabelId);

    if (convLabelError) throw convLabelError;
    if (!convLabelData || convLabelData.length === 0) {
      console.log("No conversations found with the AI care label.");
      return new Response(JSON.stringify({ message: "No conversations to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const conversationIds = convLabelData.map(item => item.conversation_id);

    // 3. Find which of these conversations already have a scheduled script
    const { data: scheduledScripts, error: scheduledScriptsError } = await supabaseAdmin
      .from('care_scripts')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('status', 'scheduled');

    if (scheduledScriptsError) throw scheduledScriptsError;

    const scheduledConvIds = new Set(scheduledScripts.map(item => item.conversation_id));

    // 4. Filter for conversations that need a new script
    const conversationsToProcess = conversationIds.filter(id => !scheduledConvIds.has(id));

    if (conversationsToProcess.length === 0) {
      console.log("All AI-labeled conversations already have a scheduled script.");
      return new Response(JSON.stringify({ message: "No new scripts needed at this time." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Get contact_id for the conversations to process
    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('chatwoot_conversations')
      .select('id, contact_id')
      .in('id', conversationsToProcess);
    
    if (contactError) throw contactError;
    const contactMap = new Map(contactData.map(item => [item.id, item.contact_id]));

    // 6. Trigger script creation for each
    let scriptsCreated = 0;
    for (const convId of conversationsToProcess) {
      const contactId = contactMap.get(convId);
      if (!contactId) {
        console.error(`Could not find contact_id for conversation_id ${convId}. Skipping.`);
        continue;
      }
      try {
        const { error } = await supabaseAdmin.functions.invoke('trigger-ai-care-script', {
          body: { conversationId: convId, contactId: contactId },
        });
        if (error) {
          console.error(`Error triggering script for convo ${convId}:`, (await error.context.json()).error || error.message);
        } else {
          scriptsCreated++;
        }
      } catch (e) {
        console.error(`Failed to process convo ${convId}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Automation run complete. Processed ${conversationsToProcess.length} conversations, created ${scriptsCreated} new scripts.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in AI care script automation:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});