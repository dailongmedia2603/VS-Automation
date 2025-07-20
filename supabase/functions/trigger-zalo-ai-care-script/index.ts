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
    const { threadId } = await req.json();
    if (!threadId) {
      throw new Error("Yêu cầu thiếu threadId.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if a script is already scheduled to avoid duplicates
    const { data: existingScripts, error: existingScriptError } = await supabaseAdmin
        .from('zalo_care_scripts')
        .select('id')
        .eq('thread_id', threadId)
        .eq('status', 'scheduled');

    if (existingScriptError) throw existingScriptError;

    if (existingScripts && existingScripts.length > 0) {
        return new Response(JSON.stringify({ message: "Kịch bản chăm sóc đã tồn tại." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // 2. If no script exists, invoke the suggestion function
    const { data: suggestion, error: suggestionError } = await supabaseAdmin.functions.invoke('suggest-zalo-care-script', {
        body: { threadId: threadId },
    });

    if (suggestionError) throw new Error(`Gợi ý thất bại cho hội thoại ${threadId}: ${(await suggestionError.context.json()).error || suggestionError.message}`);
    if (suggestion.error) throw new Error(`Lỗi từ function gợi ý: ${suggestion.error}`);

    const { content, scheduled_at } = suggestion;

    // 3. Save the new script to the database
    const { data: newScript, error: insertError } = await supabaseAdmin
        .from('zalo_care_scripts')
        .insert({
            thread_id: threadId,
            content: content,
            scheduled_at: scheduled_at,
            status: 'scheduled',
        })
        .select()
        .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: "Đã tạo kịch bản chăm sóc thành công.", script: newScript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Lỗi trong function trigger-zalo-ai-care-script:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})