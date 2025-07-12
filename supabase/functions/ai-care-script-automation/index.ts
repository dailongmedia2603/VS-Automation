// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Nhãn đặc biệt để kích hoạt tự động hóa
const AI_CARE_LABEL = 'AI chăm';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Lấy cấu hình Chatwoot
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('chatwoot_settings')
      .select('chatwoot_url, account_id, api_token')
      .eq('id', 1)
      .single();

    if (settingsError || !settings || !settings.chatwoot_url || !settings.account_id || !settings.api_token) {
      console.warn("Cấu hình Chatwoot chưa hoàn tất. Bỏ qua tác vụ tự động.");
      return new Response(JSON.stringify({ message: "Cấu hình Chatwoot chưa hoàn tất." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const chatwootSettings = {
        chatwootUrl: settings.chatwoot_url,
        accountId: settings.account_id,
        apiToken: settings.api_token,
    };

    // 2. Lấy danh sách tất cả cuộc trò chuyện
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_conversations', settings: chatwootSettings },
    });

    if (proxyError) throw new Error(`Lỗi khi lấy danh sách cuộc trò chuyện: ${(await proxyError.context.json()).error || proxyError.message}`);
    if (proxyResponse.error) throw new Error(`Lỗi từ proxy: ${proxyResponse.error}`);
    
    const allConversations = proxyResponse.data.payload || [];

    // 3. Lọc các cuộc trò chuyện có nhãn "AI chăm"
    const conversationsToProcess = allConversations.filter(convo => 
        convo.labels && convo.labels.includes(AI_CARE_LABEL)
    );

    if (conversationsToProcess.length === 0) {
        console.log("Không tìm thấy cuộc trò chuyện nào có nhãn 'AI chăm'.");
        return new Response(JSON.stringify({ message: "Không có cuộc trò chuyện nào cần xử lý." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
    
    let scriptsCreated = 0;

    // 4. Xử lý từng cuộc trò chuyện đã lọc
    for (const convo of conversationsToProcess) {
        try {
            // Kiểm tra xem đã có kịch bản nào đang được lên lịch chưa
            const { data: existingScripts, error: existingScriptError } = await supabaseAdmin
                .from('care_scripts')
                .select('id')
                .eq('conversation_id', convo.id)
                .eq('status', 'scheduled');

            if (existingScriptError) {
                console.error(`Lỗi khi kiểm tra kịch bản cho hội thoại ${convo.id}:`, existingScriptError.message);
                continue;
            }

            // Nếu đã có, bỏ qua và xử lý hội thoại tiếp theo
            if (existingScripts && existingScripts.length > 0) {
                continue;
            }

            // 5. Nếu chưa có, bắt đầu tạo kịch bản mới
            const { data: suggestion, error: suggestionError } = await supabaseAdmin.functions.invoke('suggest-care-script', {
                body: { conversationId: convo.id },
            });

            if (suggestionError) throw new Error(`Gợi ý thất bại cho hội thoại ${convo.id}: ${(await suggestionError.context.json()).error || suggestionError.message}`);
            if (suggestion.error) throw new Error(`Lỗi từ function gợi ý: ${suggestion.error}`);

            const { content, scheduled_at } = suggestion;

            // 6. Lưu kịch bản mới vào cơ sở dữ liệu
            const { error: insertError } = await supabaseAdmin
                .from('care_scripts')
                .insert({
                    conversation_id: convo.id,
                    contact_id: convo.meta.sender.id,
                    content: content,
                    scheduled_at: scheduled_at,
                    status: 'scheduled',
                });

            if (insertError) {
                console.error(`Lưu kịch bản mới thất bại cho hội thoại ${convo.id}:`, insertError.message);
            } else {
                scriptsCreated++;
            }
        } catch (e) {
            console.error(`Lỗi khi xử lý hội thoại ${convo.id}:`, e.message);
        }
    }

    return new Response(JSON.stringify({ message: `Hoàn tất. Đã xử lý ${conversationsToProcess.length} hội thoại, tạo ${scriptsCreated} kịch bản mới.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Lỗi trong function tự động hóa kịch bản:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})