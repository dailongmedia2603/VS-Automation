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
    const { conversationId, contactId } = await req.json();
    if (!conversationId || !contactId) {
      throw new Error("Yêu cầu thiếu conversationId hoặc contactId.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Kiểm tra xem đã có kịch bản nào đang được lên lịch chưa
    const { data: existingScripts, error: existingScriptError } = await supabaseAdmin
        .from('care_scripts')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('status', 'scheduled');

    if (existingScriptError) throw existingScriptError;

    // Nếu đã có, không làm gì cả
    if (existingScripts && existingScripts.length > 0) {
        return new Response(JSON.stringify({ message: "Kịch bản chăm sóc đã tồn tại." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    // 2. Nếu chưa có, bắt đầu tạo kịch bản mới
    const { data: suggestion, error: suggestionError } = await supabaseAdmin.functions.invoke('suggest-care-script', {
        body: { conversationId: conversationId },
    });

    if (suggestionError) throw new Error(`Gợi ý thất bại cho hội thoại ${conversationId}: ${(await suggestionError.context.json()).error || suggestionError.message}`);
    if (suggestion.error) throw new Error(`Lỗi từ function gợi ý: ${suggestion.error}`);

    const { content, scheduled_at } = suggestion;

    // 3. Lưu kịch bản mới vào cơ sở dữ liệu
    const { data: newScript, error: insertError } = await supabaseAdmin
        .from('care_scripts')
        .insert({
            conversation_id: conversationId,
            contact_id: contactId,
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
    console.error('Lỗi trong function trigger-ai-care-script:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})