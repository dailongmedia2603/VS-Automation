// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL_NAME = 'AI Star';

// Helper to format conversation history
const formatMessage = (msg) => {
    const sender = msg.message_type === 1 ? 'Agent' : 'User';
    const timestamp = new Date(msg.created_at_chatwoot).toLocaleString('vi-VN');
    const content = msg.content || '[Tệp đính kèm hoặc tin nhắn trống]';
    return `[${timestamp}] ${sender}: ${content}`;
}

// Helper to build the system prompt
const buildSystemPrompt = (config, history) => {
    let prompt = `Bạn là một trợ lý AI tên là ${config.role || 'Trợ lý ảo'}. 
Lĩnh vực kinh doanh của bạn là ${config.industry || 'đa dạng'}.
Phong cách của bạn là ${config.style || 'thân thiện và chuyên nghiệp'}.
Tông giọng của bạn là ${config.tone || 'nhiệt tình'}.
Bạn sẽ trả lời bằng ${config.language || 'Tiếng Việt'}.
Cách xưng hô của bạn là "${config.pronouns || 'Shop và bạn'}".
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

  try {
    const payload = await req.json();

    // We only care about incoming messages from users
    if (payload.event !== 'message_created' || payload.message_type !== 'incoming' || payload.private) {
      return new Response(JSON.stringify({ message: "Event ignored." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const conversation = payload.conversation;
    const conversationId = conversation.id;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if auto-reply is enabled
    const { data: autoReplySettings, error: settingsError } = await supabaseAdmin
      .from('auto_reply_settings').select('config').eq('id', 1).single();
    if (settingsError || !autoReplySettings || !autoReplySettings.config?.enabled) {
      return new Response(JSON.stringify({ message: "Auto-reply is disabled. Skipping." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    const trainingConfig = autoReplySettings.config;

    // 2. Check if conversation has 'AI Star' label
    if (!conversation.labels || !conversation.labels.includes(AI_STAR_LABEL_NAME)) {
        return new Response(JSON.stringify({ message: "Conversation does not have AI Star label. Skipping." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
    }

    // Set typing indicator
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: true });

    try {
        // 3. Get AI API settings
        const { data: aiSettings, error: aiSettingsError } = await supabaseAdmin
          .from('ai_settings').select('api_url, api_key').eq('id', 1).single();
        if (aiSettingsError || !aiSettings) throw new Error("AI settings not found.");

        // 4. Get conversation history from DB
        const { data: messages, error: messagesError } = await supabaseAdmin
          .from('chatwoot_messages').select('content, message_type, created_at_chatwoot')
          .eq('conversation_id', conversationId).order('created_at_chatwoot', { ascending: true });
        if (messagesError) throw messagesError;
        
        // Add the new message from the webhook to the history, as it might not be in the DB yet
        const fullHistory = [
            ...messages.map(formatMessage),
            `[${new Date(payload.created_at * 1000).toLocaleString('vi-VN')}] User: ${payload.content}`
        ].join('\n');

        // 5. Build prompt and call AI
        const systemPrompt = buildSystemPrompt(trainingConfig, fullHistory);
        const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
          body: { messages: [{ role: 'system', content: systemPrompt }], apiUrl: aiSettings.api_url, apiKey: aiSettings.api_key, model: 'gpt-4o' }
        });
        if (proxyError) throw new Error((await proxyError.context.json()).error || proxyError.message);
        if (proxyResponse.error) throw new Error(proxyResponse.error);

        const aiReply = proxyResponse.choices[0].message.content;

        // 6. Send reply to Chatwoot
        const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
        const { error: sendMessageError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
          body: { action: 'send_message', settings: chatwootSettings, conversationId: conversationId, content: aiReply }
        });
        if (sendMessageError) throw new Error((await sendMessageError.context.json()).error || sendMessageError.message);

    } catch (e) {
        console.error(`Failed to process conversation ${conversationId}:`, e.message);
        // Send a private note about the failure
        const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
        if (chatwootSettings) {
            await supabaseAdmin.functions.invoke('chatwoot-proxy', {
              body: { action: 'send_message', settings: chatwootSettings, conversationId: conversationId, content: `Lỗi AI: ${e.message}`, isPrivate: true }
            });
        }
    } finally {
        // Remove typing indicator
        await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
    }

    return new Response(JSON.stringify({ message: "Webhook processed." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error('Error in webhook handler:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
})