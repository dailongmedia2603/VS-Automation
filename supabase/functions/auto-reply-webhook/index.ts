// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL = 'AI Star';

const formatMessage = (msg) => {
    // message_type: 0 for incoming, 1 for outgoing.
    const sender = msg.message_type === 1 ? 'Agent' : 'User';
    const timestamp = new Date(msg.created_at * 1000).toLocaleString('vi-VN');
    const content = msg.content || '[Tệp đính kèm hoặc tin nhắn trống]';
    return `[${timestamp}] ${sender}: ${content}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const payload = await req.json();
  const conversationId = payload?.conversation?.id;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Function to send private error notes to Chatwoot
  const sendErrorNote = async (message) => {
    const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
    if (chatwootSettings && conversationId) {
        try {
            await supabaseAdmin.functions.invoke('chatwoot-proxy', {
                body: {
                    action: 'send_message',
                    settings: chatwootSettings,
                    conversationId: conversationId,
                    content: `AI Auto-Reply Error: ${message}`,
                    isPrivate: true,
                }
            });
        } catch (e) {
            console.error("Failed to send error note to Chatwoot:", e.message);
        }
    }
  };

  try {
    // 1. Validate webhook payload
    if (payload.event !== 'message_created' || payload.private === true || payload.message_type !== 'incoming') {
      return new Response(JSON.stringify({ message: "Ignoring event: Not a relevant message." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: true });

    // 2. Check if feature is enabled
    const { data: autoReplySettings, error: settingsError } = await supabaseAdmin
      .from('auto_reply_settings').select('config').eq('id', 1).single();
    if (settingsError || !autoReplySettings?.config?.enabled) {
      throw new Error("Auto-reply feature is disabled in settings.");
    }

    // 3. Get Chatwoot & AI settings
    const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
    if (!chatwootSettings) throw new Error("Chatwoot settings are not configured.");
    
    const { data: aiSettings } = await supabaseAdmin.from('ai_settings').select('api_url, api_key').eq('id', 1).single();
    if (!aiSettings) throw new Error("AI API settings are not configured.");

    // 4. Handle new customer tagging
    let labelNames = payload.conversation?.labels || [];
    if (payload.conversation?.messages_count === 1 && !labelNames.includes(AI_STAR_LABEL)) {
        const newLabels = [...labelNames, AI_STAR_LABEL];
        await supabaseAdmin.functions.invoke('chatwoot-proxy', {
            body: { action: 'update_labels', settings: chatwootSettings, conversationId, labels: newLabels }
        });
        labelNames.push(AI_STAR_LABEL);
    }

    // 5. Verify 'AI Star' label exists
    if (!labelNames.includes(AI_STAR_LABEL)) {
      // As a fallback, check directly with Chatwoot API
      const { data: convDetails } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
          body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId }
      });
      if (!convDetails?.payload?.labels?.includes(AI_STAR_LABEL)) {
          throw new Error(`Conversation is not tagged with '${AI_STAR_LABEL}'.`);
      }
    }

    // 6. Fetch full, real-time conversation history from Chatwoot
    const { data: messagesData, error: messagesError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_messages', settings: chatwootSettings, conversationId }
    });
    if (messagesError) throw new Error(`Failed to fetch message history: ${(await messagesError.context.json()).error || messagesError.message}`);
    const conversationHistory = messagesData.payload || [];
    if (conversationHistory.length === 0) throw new Error("Could not retrieve conversation history.");

    // 7. Construct prompt
    const trainingConfig = autoReplySettings.config;
    if (!trainingConfig) throw new Error("Auto-reply training config not found.");
    const products = trainingConfig.products?.map(p => `- ${p.value}`).join('\n') || 'Không có';
    const processSteps = trainingConfig.processSteps?.map((p, i) => `${i+1}. ${p.value}`).join('\n') || 'Không có';
    const conditions = trainingConfig.conditions?.map(c => `- ${c.value}`).join('\n') || 'Không có';
    const historyText = conversationHistory.sort((a, b) => a.created_at - b.created_at).map(formatMessage).join('\n');

    const systemPrompt = `Bạn là một ${trainingConfig.role || 'trợ lý AI chuyên nghiệp'} của một doanh nghiệp hoạt động trong lĩnh vực ${trainingConfig.industry || 'tổng hợp'}.
Phong cách của bạn là ${trainingConfig.style || 'thân thiện'}, tông giọng ${trainingConfig.tone || 'nhiệt tình'}.
Sử dụng ngôn ngữ ${trainingConfig.language || 'Tiếng Việt'} và xưng hô là ${trainingConfig.pronouns || 'mình - bạn'}.
Mục tiêu của bạn là ${trainingConfig.goal || 'trả lời câu hỏi và hỗ trợ khách hàng'}.

Sản phẩm/dịch vụ của chúng ta:
${products}

Quy trình tư vấn:
${processSteps}

Điều kiện bắt buộc phải tuân thủ:
${conditions}

Dưới đây là lịch sử cuộc trò chuyện. Dựa vào đó, hãy trả lời tin nhắn cuối cùng của khách hàng một cách tự nhiên và phù hợp.
---
${historyText}
---
Hãy tạo ra câu trả lời cho tin nhắn cuối cùng. Chỉ trả lời nội dung tin nhắn, không thêm bất kỳ lời giải thích nào.`;

    // 8. Call AI
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: { messages: [{ role: 'system', content: systemPrompt }], apiUrl: aiSettings.api_url, apiKey: aiSettings.api_key, model: 'gpt-4o' }
    });
    if (proxyError) throw new Error(`AI proxy failed: ${(await proxyError.context.json()).error || proxyError.message}`);
    if (proxyResponse.error) throw new Error(`AI service error: ${proxyResponse.error}`);

    const aiReply = proxyResponse.choices[0].message.content;

    // 9. Send reply to Chatwoot
    await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'send_message', settings: chatwootSettings, conversationId, content: aiReply, isPrivate: false }
    });

    return new Response(JSON.stringify({ success: true, reply: aiReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error(`[CONVO_ID: ${conversationId}] Auto-reply webhook error:`, error.message);
    await sendErrorNote(error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } finally {
    if (conversationId) {
      await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
    }
  }
})