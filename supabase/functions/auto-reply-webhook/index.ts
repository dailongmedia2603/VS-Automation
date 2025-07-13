// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AI_STAR_LABEL = 'AI Star';

const formatMessage = (msg) => {
    const sender = msg.message_type === 1 ? 'Agent' : 'User';
    const timestamp = new Date(msg.created_at_chatwoot || Date.now()).toLocaleString('vi-VN');
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

  try {
    // 1. Validate webhook payload from Chatwoot
    if (payload.event !== 'message_created' || payload.private === true || payload.message_type !== 'incoming') {
      return new Response(JSON.stringify({ message: "Ignoring event: Not an incoming public message." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Set AI status to typing
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: true, updated_at: new Date().toISOString() });

    // 2. Check if auto-reply is globally enabled
    const { data: autoReplySettings, error: settingsError } = await supabaseAdmin
      .from('auto_reply_settings').select('config').eq('id', 1).single();
    if (settingsError || !autoReplySettings?.config?.enabled) {
      throw new Error("Auto-reply is disabled globally.");
    }

    // 3. Fetch history and labels
    const { data: conversationHistory, error: historyError } = await supabaseAdmin
      .from('chatwoot_messages').select('content, message_type, created_at_chatwoot')
      .eq('conversation_id', conversationId).order('created_at_chatwoot', { ascending: true });
    if (historyError) throw historyError;

    const { data: labels, error: labelsError } = await supabaseAdmin
      .from('chatwoot_conversation_labels').select('chatwoot_labels(name)').eq('conversation_id', conversationId);
    if (labelsError) throw labelsError;
    const labelNames = labels.map(l => l.chatwoot_labels.name);

    // 4. Handle new customer tagging
    const isNewCustomerMessage = (conversationHistory || []).filter(m => m.message_type === 0).length === 0;
    if (isNewCustomerMessage && !labelNames.includes(AI_STAR_LABEL)) {
      const { data: aiStarLabelData } = await supabaseAdmin.from('chatwoot_labels').select('id').eq('name', AI_STAR_LABEL).single();
      if (aiStarLabelData) {
        await supabaseAdmin.from('chatwoot_conversation_labels').insert({ conversation_id: conversationId, label_id: aiStarLabelData.id });
        labelNames.push(AI_STAR_LABEL);
      }
    }

    // 5. Check if conversation has 'AI Star' tag
    if (!labelNames.includes(AI_STAR_LABEL)) {
      throw new Error("Conversation does not have AI Star label.");
    }

    const fullHistory = [...(conversationHistory || []), {
        content: payload.content,
        message_type: 0,
        created_at_chatwoot: new Date(payload.created_at * 1000).toISOString()
    }];

    if (fullHistory.length === 0) throw new Error("Could not retrieve conversation history.");

    // 6. Get AI training prompt
    const trainingConfig = autoReplySettings.config;
    if (!trainingConfig) throw new Error("Auto-reply training config not found.");

    const products = trainingConfig.products?.map(p => `- ${p.value}`).join('\n') || 'Không có';
    const processSteps = trainingConfig.processSteps?.map((p, i) => `${i+1}. ${p.value}`).join('\n') || 'Không có';
    const conditions = trainingConfig.conditions?.map(c => `- ${c.value}`).join('\n') || 'Không có';
    const historyText = fullHistory.map(formatMessage).join('\n');

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

    // 7. Call AI to get response
    const { data: aiSettings } = await supabaseAdmin.from('ai_settings').select('api_url, api_key').eq('id', 1).single();
    if (!aiSettings) throw new Error("AI settings not found.");

    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: { messages: [{ role: 'system', content: systemPrompt }], apiUrl: aiSettings.api_url, apiKey: aiSettings.api_key, model: 'gpt-4o' }
    });
    if (proxyError) throw new Error((await proxyError.context.json()).error || proxyError.message);
    if (proxyResponse.error) throw new Error(proxyResponse.error);

    const aiReply = proxyResponse.choices[0].message.content;

    // 8. Send reply to Chatwoot
    const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
    if (!chatwootSettings) throw new Error("Chatwoot settings not found.");

    const endpoint = `/api/v1/accounts/${chatwootSettings.account_id}/conversations/${conversationId}/messages`;
    const upstreamUrl = `${chatwootSettings.chatwoot_url.replace(/\/$/, '')}${endpoint}`;

    const chatwootResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api_access_token': chatwootSettings.api_token },
        body: JSON.stringify({ content: aiReply, message_type: 'outgoing', private: false }),
    });

    if (!chatwootResponse.ok) {
        const errorText = await chatwootResponse.text();
        throw new Error(`Chatwoot API Error: ${chatwootResponse.status} ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true, reply: aiReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error(`Auto-reply webhook error for convo ${conversationId}:`, error.message);
    // Send a private note to the conversation about the error
    const errorMessage = `AI Auto-Reply Error: ${error.message}. AI will not reply.`;
    const { data: chatwootSettings } = await supabaseAdmin.from('chatwoot_settings').select('*').eq('id', 1).single();
    if (chatwootSettings && conversationId) {
        const endpoint = `/api/v1/accounts/${chatwootSettings.account_id}/conversations/${conversationId}/messages`;
        const upstreamUrl = `${chatwootSettings.chatwoot_url.replace(/\/$/, '')}${endpoint}`;
        await fetch(upstreamUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api_access_token': chatwootSettings.api_token },
            body: JSON.stringify({ content: errorMessage, message_type: 'outgoing', private: true }),
        });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, // Return 200 to prevent Chatwoot from retrying
    })
  } finally {
    // Set AI status to not typing
    if (conversationId) {
      await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false, updated_at: new Date().toISOString() });
    }
  }
})