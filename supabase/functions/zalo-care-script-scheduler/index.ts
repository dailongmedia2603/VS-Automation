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

    // 1. Get Zalo care settings to find the trigger label ID
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('zalo_care_settings')
      .select('config')
      .eq('id', 1)
      .single();
    
    if (settingsError) throw settingsError;
    const triggerLabelId = settings?.config?.trigger_label_id;

    // 2. Find all scheduled scripts that are due
    const { data: scripts, error: scriptsError } = await supabaseAdmin
      .from('zalo_care_scripts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (scriptsError) throw scriptsError;

    if (!scripts || scripts.length === 0) {
      return new Response(JSON.stringify({ message: "No scheduled scripts to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 3. Process each script
    for (const script of scripts) {
      try {
        // CLAIM: Update status to 'sending'
        const { error: claimError } = await supabaseAdmin
          .from('zalo_care_scripts')
          .update({ status: 'sending' })
          .eq('id', script.id)
          .eq('status', 'scheduled');
        if (claimError) continue; // Another instance probably claimed it

        // EXECUTE: Send message via n8n proxy
        const { data: contactData } = await supabaseAdmin
          .from('zalo_user')
          .select('displayName, zaloName, avatar')
          .eq('userId', script.thread_id)
          .single();

        const payload = {
          content: script.content,
          attachmentUrl: script.image_url,
          recipient: {
            id: script.thread_id,
            name: contactData?.displayName || contactData?.zaloName || 'Khách hàng',
            avatar: contactData?.avatar,
          },
          status: 'đã xem',
          sentAt: new Date().toISOString(),
        };

        const { error: proxyError } = await supabaseAdmin.functions.invoke('n8n-zalo-webhook-proxy', { body: payload });
        if (proxyError) throw new Error(`Webhook proxy failed: ${proxyError.message}`);

        // Update status to 'sent'
        await supabaseAdmin
          .from('zalo_care_scripts')
          .update({ status: 'sent' })
          .eq('id', script.id);

        // Re-trigger AI care if the tag is still present
        if (triggerLabelId) {
          const { data: labelLink, error: labelLinkError } = await supabaseAdmin
            .from('zalo_conversation_labels')
            .select('thread_id')
            .eq('thread_id', script.thread_id)
            .eq('label_id', triggerLabelId)
            .maybeSingle();
          
          if (labelLinkError) {
            console.error(`Error checking for trigger label on thread ${script.thread_id}:`, labelLinkError.message);
          } else if (labelLink) {
            // The tag is still there, so trigger the next script
            console.log(`Script sent for ${script.thread_id}. Re-triggering AI care script creation.`);
            const { error: triggerError } = await supabaseAdmin.functions.invoke('trigger-zalo-ai-care-script', {
              body: { threadId: script.thread_id },
            });
            if (triggerError) {
              console.error(`Failed to re-trigger care script for ${script.thread_id}:`, triggerError.message);
            }
          }
        }

      } catch (e) {
        console.error(`Failed to process script ${script.id}:`, e.message);
        await supabaseAdmin
          .from('zalo_care_scripts')
          .update({ status: 'failed' })
          .eq('id', script.id);
      }
    }

    return new Response(JSON.stringify({ message: `Processed ${scripts.length} scripts.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error('Error in Zalo care script scheduler:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})