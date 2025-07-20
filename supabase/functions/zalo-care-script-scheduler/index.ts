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

    for (const script of scripts) {
      try {
        const { error: claimError } = await supabaseAdmin
          .from('zalo_care_scripts')
          .update({ status: 'sending' })
          .eq('id', script.id)
          .eq('status', 'scheduled');
        if (claimError) continue;

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

        await supabaseAdmin
          .from('zalo_care_scripts')
          .update({ status: 'sent' })
          .eq('id', script.id);

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