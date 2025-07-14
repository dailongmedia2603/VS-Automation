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

const buildSystemPrompt = (config, history) => {
    let prompt = `Bạn là một trợ lý AI tên là ${config.role || 'Trợ lý ảo'}. 
Lĩnh vực kinh doanh của bạn là ${config.industry || 'đa dạng'}.
Phong cách của bạn là ${config.style || 'thân thiện và chuyên nghiệp'}.
Tông giọng của bạn là ${config.tone || 'nhiệt tình'}.
Bạn sẽ trả lời bằng ${config.language || 'Tiếng Việt'}.
Bạn bắt buộc phải xưng hô là "${config.pronouns || 'Shop'}" và gọi khách hàng là "${config.customerPronouns || 'bạn'}". Đây là điều kiện không được vi phạm.
Mục tiêu của cuộc trò chuyện là ${config.goal || 'giải đáp thắc mắc và hỗ trợ khách hàng'}.

Sản phẩm/dịch vụ của bạn bao gồm:
${config.products && config.products.length > 0 ? config.products.map(p => `- ${p.value}`).join('\n') : 'Không có thông tin.'}

Quy trình tư vấn bạn cần tuân thủ:
${config.processSteps && config.processSteps.length > 0 ? config.processSteps.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : 'Không có quy trình cụ thể.'}

Các điều kiện bắt buộc bạn phải tuân thủ:
${config.conditions && config.conditions.length > 0 ? config.conditions.map(c => `- ${c.value}`).join('\n') : 'Không có điều kiện đặc biệt.'}

Dưới đây là lịch sử cuộc trò chuyện:
---
${history}
---
Dựa vào thông tin trên và lịch sử trò chuyện, hãy tạo một câu trả lời phù hợp cho tin nhắn cuối cùng của khách hàng. Chỉ trả lời với nội dung tin nhắn, không thêm bất kỳ tiền tố nào như "Agent:" hay "AI:".`;
    return prompt;
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

  const logToDb = async (status, details) => {
    await supabaseAdmin.from('ai_reply_logs').insert({
      conversation_id: conversationId,
      status,
      details,
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

  try {
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: true });

    const [autoReplySettingsRes, aiSettingsRes] = await Promise.all([
        supabaseAdmin.from('auto_reply_settings').select('config').eq('id', 1).single(),
        supabaseAdmin.from('ai_settings').select('api_url, api_key').eq('id', 1).single(),
    ]);

    if (aiSettingsRes.error || !aiSettingsRes.data) throw new Error("Không tìm thấy cấu hình AI. Vui lòng kiểm tra trang Cài đặt API AI.");
    if (autoReplySettingsRes.error || !autoReplySettingsRes.data || !autoReplySettingsRes.data.config?.enabled) {
        return new Response(JSON.stringify({ message: "Auto-reply disabled." }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!chatwootSettings) throw new Error("Không tìm thấy cấu hình Chatwoot. Vui lòng kiểm tra trang Cài đặt Chatbot.");

    const trainingConfig = autoReplySettingsRes.data.config;
    const aiSettings = aiSettingsRes.data;

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chatwoot_messages').select('content, message_type, created_at_chatwoot')
      .eq('conversation_id', conversationId).order('created_at_chatwoot', { ascending: true });
    if (messagesError || !messages || messages.length === 0) {
      throw new Error(`Không tìm thấy tin nhắn cho cuộc trò chuyện #${conversationId}`);
    }
    const conversationHistory = messages.map(formatMessage).join('\n');

    const systemPrompt = buildSystemPrompt(trainingConfig, conversationHistory);
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

    // Mark as read and remove AI Star tag
    const { data: convoDetails } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId: conversationId } });
    const currentLabels = convoDetails?.labels || [];
    const newLabels = currentLabels.filter((label: string) => label !== AI_STAR_LABEL_NAME);
    
    await Promise.all([
        supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings: chatwootSettings, conversationId: conversationId, labels: newLabels } }),
        supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings: chatwootSettings, conversationId: conversationId } })
    ]);

    await logToDb('success', `AI đã trả lời thành công với nội dung: "${aiReply.substring(0, 100)}..."`);

    return new Response(JSON.stringify({ message: `Successfully processed conversation ${conversationId}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (e) {
    console.error(`Failed to process conversation ${conversationId}:`, e.message);
    await sendErrorNote(e.message);
    await logToDb('error', e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } finally {
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
  }
});