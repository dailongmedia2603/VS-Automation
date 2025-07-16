// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL_NAME = 'AI Star';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Kiểm tra xem tự động trả lời có được bật không và lấy cài đặt Chatwoot
    const { data: autoReplySettings, error: settingsError } = await supabaseAdmin
      .from('auto_reply_settings').select('config').eq('id', 1).single();
    if (settingsError || !autoReplySettings || !autoReplySettings.config?.enabled) {
      return new Response(JSON.stringify({ message: "Auto-reply is disabled. Skipping." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const { data: chatwootSettings, error: chatwootSettingsError } = await supabaseAdmin
      .from('chatwoot_settings').select('*').eq('id', 1).single();
    if (chatwootSettingsError || !chatwootSettings) {
        console.warn("Chatwoot settings not found. Skipping automation.");
        return new Response(JSON.stringify({ message: "Chatwoot settings not found." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
    }

    // 2. Gọi trực tiếp API Chatwoot để lấy dữ liệu "sống"
    const { data: chatwootData, error: functionError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_conversations', settings: chatwootSettings },
    });

    if (functionError) {
        throw new Error(`Lỗi khi lấy danh sách cuộc trò chuyện từ Chatwoot: ${(await functionError.context.json()).error || functionError.message}`);
    }
    if (chatwootData.error) {
        throw new Error(`Lỗi từ Chatwoot proxy: ${chatwootData.error}`);
    }

    const allConversations = chatwootData.data.payload || [];

    // 3. Lọc thông minh dựa trên dữ liệu "sống"
    const conversationsToProcess = allConversations.filter(convo => 
        convo.unread_count > 0 && convo.labels.includes(AI_STAR_LABEL_NAME)
    );

    if (conversationsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "Không có cuộc trò chuyện chưa đọc nào có thẻ AI Star để xử lý." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // 4. Kích hoạt AI cho mỗi cuộc trò chuyện hợp lệ
    for (const convo of conversationsToProcess) {
      try {
        // Không cần `await` để các worker có thể chạy song song
        supabaseAdmin.functions.invoke('auto-reply-worker', {
          body: { conversationId: convo.id },
        });
      } catch (e) {
        console.error(`Không thể kích hoạt worker cho cuộc trò chuyện ${convo.id}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Đã kích hoạt worker cho ${conversationsToProcess.length} cuộc trò chuyện.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Lỗi trong hệ thống tự động hóa trả lời:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});