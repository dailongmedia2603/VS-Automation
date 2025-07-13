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
            const { error } = await supabaseAdmin.functions.invoke('trigger-ai-care-script', {
                body: { 
                    conversationId: convo.id,
                    contactId: convo.meta.sender.id,
                },
            });
            if (error) {
                console.error(`Lỗi khi trigger kịch bản cho hội thoại ${convo.id}:`, (await error.context.json()).error || error.message);
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