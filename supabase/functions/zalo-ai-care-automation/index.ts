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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get the trigger label ID from settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('zalo_care_settings')
      .select('config')
      .eq('id', 1)
      .single();

    const triggerLabelId = settings?.config?.trigger_label_id;
    if (settingsError || !triggerLabelId) {
      console.log("AI care trigger label not configured. Skipping automation.");
      return new Response(JSON.stringify({ message: "Trigger label not configured." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Find all conversations with this label
    const { data: convLabelData, error: convLabelError } = await supabaseAdmin
      .from('zalo_conversation_labels')
      .select('thread_id')
      .eq('label_id', triggerLabelId);

    if (convLabelError) throw convLabelError;
    if (!convLabelData || convLabelData.length === 0) {
      return new Response(JSON.stringify({ message: "No conversations with the trigger label." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const conversationsWithLabel = convLabelData.map(item => item.thread_id);

    // 3. Find which of these conversations already have a scheduled script
    const { data: scheduledScripts, error: scheduledScriptsError } = await supabaseAdmin
      .from('zalo_care_scripts')
      .select('thread_id')
      .in('thread_id', conversationsWithLabel)
      .eq('status', 'scheduled');

    if (scheduledScriptsError) throw scheduledScriptsError;
    const conversationsWithScheduledScript = new Set(scheduledScripts.map(item => item.thread_id));

    // 4. Filter for conversations that need a new script
    const conversationsToProcess = conversationsWithLabel.filter(id => !conversationsWithScheduledScript.has(id));

    if (conversationsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "No new scripts needed at this time." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Trigger script creation for each
    let scriptsCreated = 0;
    for (const threadId of conversationsToProcess) {
      try {
        const { error } = await supabaseAdmin.functions.invoke('trigger-zalo-ai-care-script', {
          body: { threadId: threadId },
        });
        if (error) {
          console.error(`Error triggering script for thread ${threadId}:`, (await error.context.json()).error || error.message);
        } else {
          scriptsCreated++;
        }
      } catch (e) {
        console.error(`Failed to process thread ${threadId}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Automation run complete. Processed ${conversationsToProcess.length} conversations, created ${scriptsCreated} new scripts.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Zalo AI care automation:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});