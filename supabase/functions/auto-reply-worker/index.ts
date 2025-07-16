// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL_NAME = 'AI Star';

const formatMessage = (msg) => {
    const sender = msg.message_type === 1 ? 'Agent' : 'User';
    const timestamp = new Date(msg.created_at_chatwoot).toLocaleString('vi-VN');
    const content = msg.content || '[Tệp đính kèm hoặc tin nhắn trống]';
    return `[${timestamp}] ${sender}: ${content}`;
}

const buildSystemPrompt = (config, history, context) => {
    const trainingDataSection = `
# YÊU CẦU TƯ VẤN CHO FANPAGE
Bạn là một trợ lý AI cho fanpage. Hãy dựa vào các thông tin dưới đây để tư vấn cho khách hàng.

## THÔNG TIN HUẤN LUYỆN CHUNG
- **Vai trò của bạn:** ${config.role || 'Chuyên viên tư vấn'}
- **Lĩnh vực kinh doanh:** ${config.industry || 'Không có thông tin'}
- **Sản phẩm/Dịch vụ:** 
${config.products && config.products.length > 0 ? config.products.map(p => `  - ${p.value}`).join('\n') : '  - Không có thông tin.'}
- **Phong cách:** ${config.style || 'Thân thiện, chuyên nghiệp'}
- **Tông giọng:** ${config.tone || 'Nhiệt tình'}
- **Ngôn ngữ:** ${config.language || 'Tiếng Việt'}
- **Cách xưng hô (Bạn xưng là):** "${config.pronouns || 'Shop'}"
- **Cách xưng hô (Khách hàng là):** "${config.customerPronouns || 'bạn'}"
- **Mục tiêu cuộc trò chuyện:** ${config.goal || 'Hỗ trợ và giải đáp thắc mắc'}

## QUY TRÌNH TƯ VẤN
${config.processSteps && config.processSteps.length > 0 ? config.processSteps.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : 'Không có quy trình cụ thể.'}

## ĐIỀU KIỆN BẮT BUỘC
${config.conditions && config.conditions.length > 0 ? config.conditions.map(c => `- ${c.value}`).join('\n') : 'Không có điều kiện đặc biệt.'}
`;
    const historySection = `
# LỊCH SỬ CUỘC TRÒ CHUYỆN
Dưới đây là toàn bộ lịch sử trò chuyện. Hãy phân tích để hiểu ngữ cảnh và trả lời tin nhắn cuối cùng của khách hàng.
---
${history}
---
`;
    let documentSection = '';
    if (context && context.length > 0) {
        const doc = context[0];
        documentSection = `
# TÀI LIỆU NỘI BỘ THAM KHẢO
Hệ thống đã tìm thấy một tài liệu nội bộ có liên quan. Hãy dựa vào đây để trả lời.
- **Tiêu đề tài liệu:** ${doc.title || 'Không có'}
- **Mục đích:** ${doc.purpose || 'Không có'}
- **Loại tài liệu:** ${doc.document_type || 'Không có'}
- **Nội dung chính:** 
  ${doc.content || 'Không có'}

>>> **VÍ DỤ ÁP DỤNG (RẤT QUAN TRỌNG):**
- **Khi khách hỏi tương tự:** "${doc.example_customer_message || 'Không có'}"
- **Hãy trả lời theo mẫu:** "${doc.example_agent_reply || 'Không có'}"
<<<
`;
    } else {
        documentSection = `
# TÀI LIỆU NỘI BỘ THAM KHẢO
Không tìm thấy tài liệu nội bộ nào liên quan. Hãy trả lời dựa trên thông tin huấn luyện chung và lịch sử trò chuyện.
`;
    }
    const actionSection = `
# HÀNH ĐỘNG
Dựa vào TOÀN BỘ thông tin trên, hãy tạo một câu trả lời duy nhất cho tin nhắn cuối cùng của khách hàng.
**QUAN TRỌNG:** Chỉ trả lời với nội dung tin nhắn, không thêm bất kỳ tiền tố nào như "AI:", "Trả lời:", hay lời chào nào nếu không cần thiết theo ngữ cảnh.
`;
    return `${trainingDataSection}\n${historySection}\n${documentSection}\n${actionSection}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { conversationId } = await req.json();
  if (!conversationId) {
    return new Response(JSON.stringify({ error: "Missing conversationId" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const logToDb = async (status, details, system_prompt = null) => {
    await supabaseAdmin.from('ai_reply_logs').insert({
      conversation_id: conversationId,
      status,
      details,
      system_prompt,
    });
  };

  const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();

  const sendErrorNote = async (errorMessage) => {
    if (!chatwootSettings) return;
    try {
      await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: {
          action: 'send_message',
          settings: chatwootSettings,
          conversationId: conversationId,
          content: `**Lỗi AI trả lời tự động:**\n\n${errorMessage}`,
          isPrivate: true,
        }
      });
    } catch (e) {
      console.error(`Failed to send error note for convo ${conversationId}:`, e.message);
    }
  };

  let systemPrompt = null;
  try {
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: true });

    const [autoReplySettingsRes, aiSettingsRes] = await Promise.all([
        supabaseAdmin.from('auto_reply_settings').select('config').eq('id', 1).single(),
        supabaseAdmin.from('ai_settings').select('api_url, api_key').eq('id', 1).single(),
    ]);

    if (aiSettingsRes.error || !aiSettingsRes.data) throw new Error("Không tìm thấy cấu hình AI.");
    if (autoReplySettingsRes.error || !autoReplySettingsRes.data || !autoReplySettingsRes.data.config?.enabled) {
        return new Response(JSON.stringify({ message: "Auto-reply disabled." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!chatwootSettings) throw new Error("Không tìm thấy cấu hình Chatwoot.");

    const trainingConfig = autoReplySettingsRes.data.config;
    const aiSettings = aiSettingsRes.data;

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chatwoot_messages').select('content, message_type, created_at_chatwoot')
      .eq('conversation_id', conversationId).order('created_at_chatwoot', { ascending: true });
    if (messagesError || !messages || messages.length === 0) {
      throw new Error(`Không tìm thấy tin nhắn cho cuộc trò chuyện #${conversationId}`);
    }
    const conversationHistory = messages.map(formatMessage).join('\n');
    const lastUserMessage = messages.filter(m => m.message_type === 0).pop()?.content || '';

    let context = null;
    if (lastUserMessage) {
        const { data: searchResults, error: searchError } = await supabaseAdmin.functions.invoke('search-documents', {
            body: { query: lastUserMessage }
        });
        if (searchError) console.error("Lỗi tìm kiếm tài liệu:", searchError.message);
        else context = searchResults;
    }

    systemPrompt = buildSystemPrompt(trainingConfig, conversationHistory, context);
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: { messages: [{ role: 'system', content: systemPrompt }], apiUrl: aiSettings.api_url, apiKey: aiSettings.api_key, model: 'gpt-4o' }
    });
    if (proxyError) throw new Error(`Lỗi gọi AI Proxy: ${(await proxyError.context.json()).error || proxyError.message}`);
    if (proxyResponse.error) throw new Error(`Lỗi từ AI Proxy: ${proxyResponse.error}`);

    const aiReply = proxyResponse.choices[0].message.content;

    const { error: sendMessageError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
      body: { action: 'send_message', settings: chatwootSettings, conversationId: conversationId, content: aiReply }
    });
    if (sendMessageError) throw new Error(`Lỗi gửi tin nhắn qua Chatwoot: ${(await sendMessageError.context.json()).error || sendMessageError.message}`);

    const { data: convoDetails } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId: conversationId } });
    const currentLabels = convoDetails?.labels || [];
    const newLabels = currentLabels.filter((label: string) => label !== AI_STAR_LABEL_NAME);
    
    await Promise.all([
        supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings: chatwootSettings, conversationId: conversationId, labels: newLabels } }),
        supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings: chatwootSettings, conversationId: conversationId } })
    ]);

    await logToDb('success', `AI đã trả lời thành công với nội dung: "${aiReply.substring(0, 100)}..."`, systemPrompt);

    return new Response(JSON.stringify({ message: `Successfully processed conversation ${conversationId}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (e) {
    console.error(`Failed to process conversation ${conversationId}:`, e.message);
    await sendErrorNote(e.message);
    await logToDb('error', e.message, systemPrompt);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } finally {
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
  }
});