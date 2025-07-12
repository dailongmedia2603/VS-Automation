// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function will be triggered by a cron job (e.g., every minute).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use the service role key to have full access to the database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Find all scheduled scripts that are due
    const { data: scripts, error: scriptsError } = await supabaseAdmin
      .from('care_scripts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())

    if (scriptsError) {
      throw scriptsError
    }

    if (!scripts || scripts.length === 0) {
      console.log("No scheduled scripts to send.");
      return new Response(JSON.stringify({ message: "No scheduled scripts to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${scripts.length} scripts to process.`);

    // 2. Get Chatwoot settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('chatwoot_settings')
      .select('chatwoot_url, account_id, api_token')
      .eq('id', 1)
      .single()

    if (settingsError || !settings) {
      throw new Error("Could not retrieve Chatwoot settings.");
    }
    
    const chatwootSettings = {
        chatwootUrl: settings.chatwoot_url,
        accountId: settings.account_id,
        apiToken: settings.api_token,
    };

    // 3. Process each script
    for (const script of scripts) {
      try {
        // Use the chatwoot-proxy to send the message
        const { error: invokeError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
          body: {
            action: 'send_message',
            settings: chatwootSettings,
            conversationId: script.conversation_id,
            content: script.content,
            isPrivate: false,
          },
        })

        if (invokeError) {
          throw invokeError;
        }

        // 4. Update the script status to 'sent'
        await supabaseAdmin
          .from('care_scripts')
          .update({ status: 'sent' })
          .eq('id', script.id)

        console.log(`Successfully sent script ${script.id} to conversation ${script.conversation_id}`);

      } catch (e) {
        console.error(`Failed to process script ${script.id}:`, e.message);
        // Update status to 'failed'
        await supabaseAdmin
          .from('care_scripts')
          .update({ status: 'failed' })
          .eq('id', script.id)
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${scripts.length} scripts.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in care script scheduler:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})