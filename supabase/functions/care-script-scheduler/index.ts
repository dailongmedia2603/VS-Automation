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
    )

    // 1. Get Chatwoot settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('chatwoot_settings')
      .select('chatwoot_url, account_id, api_token')
      .eq('id', 1)
      .single()

    if (settingsError || !settings || !settings.chatwoot_url || !settings.account_id || !settings.api_token) {
      console.warn("Chatwoot settings are incomplete. Skipping run.");
      return new Response(JSON.stringify({ message: "Chatwoot settings incomplete, skipping run." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Find all scheduled scripts that are due
    const { data: scripts, error: scriptsError } = await supabaseAdmin
      .from('care_scripts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())

    if (scriptsError) throw scriptsError;

    if (!scripts || scripts.length === 0) {
      return new Response(JSON.stringify({ message: "No scheduled scripts to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${scripts.length} scripts to process.`);

    let processedCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    // 3. Process each script with "Claim, then Execute" logic
    for (const script of scripts) {
      processedCount++;
      let currentScriptStatus = 'failed'; // Default to failed if anything goes wrong

      try {
        // CLAIM: Attempt to update status from 'scheduled' to 'sending'
        const { data: claimedScript, error: claimError } = await supabaseAdmin
          .from('care_scripts')
          .update({ status: 'sending' })
          .eq('id', script.id)
          .eq('status', 'scheduled') // Crucial for atomic claim
          .select()
          .single();

        if (claimError) {
          console.error(`Failed to claim script ${script.id}:`, claimError.message);
          // If claim fails, it means another instance already claimed/processed it, so skip.
          continue; 
        }
        if (!claimedScript) {
          // This means the script was already processed by another concurrent function instance
          console.log(`Script ${script.id} already claimed by another instance.`);
          continue;
        }

        // EXECUTE: Send message to Chatwoot
        const endpoint = `/api/v1/accounts/${settings.account_id}/conversations/${script.conversation_id}/messages`;
        const upstreamUrl = `${settings.chatwoot_url.replace(/\/$/, '')}${endpoint}`;

        const response = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': settings.api_token,
          },
          body: JSON.stringify({
            content: script.content,
            message_type: 'outgoing',
            private: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chatwoot API Error: ${response.status} ${errorText}`);
        }

        // If successful, update script status to 'sent'
        await supabaseAdmin
          .from('care_scripts')
          .update({ status: 'sent' })
          .eq('id', script.id); // Update by ID, not by claimedScript.id to avoid race condition on update
        
        currentScriptStatus = 'sent';
        sentCount++;
        console.log(`Successfully sent script ${script.id} to conversation ${script.conversation_id}`);

      } catch (e) {
        console.error(`Failed to process script ${script.id}:`, e.message);
        // Update status to 'failed' if an error occurred during sending
        await supabaseAdmin
          .from('care_scripts')
          .update({ status: 'failed' })
          .eq('id', script.id);
        failedCount++;
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${processedCount} scripts. Sent: ${sentCount}, Failed: ${failedCount}.` }), {
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