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
    const timestamp = new Date(msg.created_at * 1000).toLocaleString('vi-VN');
    const content = msg.content || '[Tệp đính kèm hoặc tin nhắn trống]';
    return `[${timestamp}] ${sender}: ${content}`;
}

const buildDynamicSystemPrompt = (config, history, context) => {
  const formatList = (items) => items && items.length > 0 ? items.map(p => `- ${p.value}`).join('\n') : 'Không có thông tin.';
  const formatNumberedList = (items) => items && items.length > 0 ? items.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : 'Không có quy trình cụ thể.';

  const formatDocumentContext = (docContext) => {
    if (docContext && docContext.length > 0) {
      const doc = docContext[0];
      return `Hệ thống đã tìm thấy một tài liệu nội bộ có liên quan. Hãy dựa vào đây để trả lời.\n- **Tiêu đề tài liệu:** ${doc.title || 'Không có'}\n- **Mục đích:** ${doc.purpose || 'Không có'}\n- **Loại tài liệu:** ${doc.document_type || 'Không có'}\n- **Nội dung chính:** \n  ${doc.content || 'Không có'}\n\n>>> **VÍ DỤ ÁP DỤNG (RẤT QUAN TRỌNG):**\n- **Khi khách hỏi tương tự:** "${doc.example_customer_message || 'Không có'}"\n- **Hãy trả lời theo mẫu:** "${doc.example_agent_reply || 'Không có'}"\n<<<`;
    }
    return 'Không tìm thấy tài liệu nội bộ nào liên quan. Hãy trả lời dựa trên thông tin huấn luyện chung và lịch sử trò chuyện.';
  };

  const dataMap = {
    '{{industry}}': config.industry || 'Không có thông tin',
    '{{role}}': config.role || 'Chuyên viên tư vấn',
    '{{products}}': formatList(config.products),
    '{{style}}': config.style || 'Thân thiện, chuyên nghiệp',
    '{{tone}}': config.tone || 'Nhiệt tình',
    '{{language}}': config.language || 'Tiếng Việt',
    '{{pronouns}}': config.pronouns || 'Shop',
    '{{customerPronouns}}': config.customerPronouns || 'bạn',
    '{{goal}}': config.goal || 'Hỗ trợ và giải đáp thắc mắc',
    '{{processSteps}}': formatNumberedList(config.processSteps),
    '{{conditions}}': formatList(config.conditions),
    '{{conversation_history}}': history,
    '{{document_context}}': formatDocumentContext(context),
  };

  if (!config.promptTemplate || config.promptTemplate.length === 0) {
    throw new Error("Prompt template is not configured.");
  }

  const finalPrompt = config.promptTemplate.map(block => {
    let content = block.content;
    for (const [key, value] of Object.entries(dataMap)) {
      content = content.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }
    return `# ${block.title.toUpperCase()}\n${content}`;
  }).join('\n\n');

  return finalPrompt;
};


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

    const { data: messagesData, error: messagesError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', {
        body: { action: 'list_messages', settings: chatwootSettings, conversationId: conversationId }
    });
    if (messagesError) throw new Error(`Lỗi khi tải tin nhắn từ Chatwoot: ${(await messagesError.context.json()).error || messagesError.message}`);
    
    const messages = messagesData.payload.sort((a, b) => a.created_at - b.created_at) || [];
    if (!messages || messages.length === 0) throw new Error(`Không tìm thấy tin nhắn cho cuộc trò chuyện #${conversationId}`);
    
    const lastUserMessage = messages.filter(m => m.message_type === 0).pop()?.content || '';

    // --- START: KEYWORD ACTION CHECK ---
    const { data: keywordRules } = await supabaseAdmin.from('keyword_actions').select('*').eq('is_active', true);
    if (keywordRules && keywordRules.length > 0) {
      for (const rule of keywordRules) {
        let match = false;
        if (rule.type === 'phone_number' && /(0[3|5|7|8|9][0-9]{8})\b/.test(lastUserMessage)) {
          match = true;
        } else if (rule.type === 'keyword' && rule.keyword && lastUserMessage.toLowerCase().includes(rule.keyword.toLowerCase())) {
          match = true;
        }

        if (match) {
          if (rule.action_type === 'stop_auto_reply') {
            const { data: convoDetails, error: convoError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId: conversationId } });
            if (convoError) throw new Error(`Lỗi lấy chi tiết hội thoại: ${(await convoError.context.json()).error || convoError.message}`);
            const newLabels = (convoDetails?.labels || []).filter((l: string) => l !== AI_STAR_LABEL_NAME);
            const { error: labelError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings: chatwootSettings, conversationId: conversationId, labels: newLabels } });
            if (labelError) throw new Error(`Lỗi cập nhật nhãn: ${(await labelError.context.json()).error || labelError.message}`);
            await logToDb('success', `Dừng trả lời tự động do quy tắc #${rule.id}.`);
          } else if (rule.action_type === 'reply_with_content' && rule.reply_content) {
            const { error: sendError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings: chatwootSettings, conversationId: conversationId, content: rule.reply_content } });
            if (sendError) throw new Error(`Lỗi gửi tin nhắn theo quy tắc: ${(await sendError.context.json()).error || sendError.message}`);
            
            const { data: convoDetails, error: convoError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId: conversationId } });
            if (convoError) throw new Error(`Lỗi lấy chi tiết hội thoại: ${(await convoError.context.json()).error || convoError.message}`);
            
            const newLabels = (convoDetails?.labels || []).filter((l: string) => l !== AI_STAR_LABEL_NAME);
            
            const { error: labelError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings: chatwootSettings, conversationId: conversationId, labels: newLabels } });
            if (labelError) console.error("Lỗi cập nhật nhãn (không nghiêm trọng):", labelError.message);

            const { error: readError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings: chatwootSettings, conversationId: conversationId } });
            if (readError) console.error("Lỗi đánh dấu đã đọc (không nghiêm trọng):", readError.message);

            await logToDb('success', `Đã trả lời theo quy tắc #${rule.id}.`);
          }
          await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
          return new Response(JSON.stringify({ message: `Processed with keyword rule #${rule.id}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
      }
    }
    // --- END: KEYWORD ACTION CHECK ---

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
    const conversationHistory = messages.map(formatMessage).join('\n');

    let context = null;
    if (lastUserMessage) {
        const richQuery = `Bối cảnh kinh doanh: ${trainingConfig.industry || 'Không rõ'}. Sản phẩm/dịch vụ chính: ${trainingConfig.products?.map(p => p.value).join(', ') || 'Không rõ'}. Câu hỏi của khách hàng: ${lastUserMessage}`.trim().replace(/\s+/g, ' ');
        const { data: searchResults, error: searchError } = await supabaseAdmin.functions.invoke('search-documents', { body: { query: richQuery } });
        if (searchError) console.error("Lỗi tìm kiếm tài liệu:", searchError.message);
        else context = searchResults;
    }

    systemPrompt = buildDynamicSystemPrompt(trainingConfig, conversationHistory, context);
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: { messages: [{ role: 'system', content: systemPrompt }], apiUrl: aiSettings.api_url, apiKey: aiSettings.api_key, model: 'gpt-4o' }
    });
    if (proxyError) throw new Error(`Lỗi gọi AI Proxy: ${(await proxyError.context.json()).error || proxyError.message}`);
    if (proxyResponse.error) throw new Error(`Lỗi từ AI Proxy: ${proxyResponse.error}`);

    const aiReply = proxyResponse.choices[0].message.content;

    const { error: sendMessageError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'send_message', settings: chatwootSettings, conversationId: conversationId, content: aiReply } });
    if (sendMessageError) throw new Error(`Lỗi gửi tin nhắn qua Chatwoot: ${(await sendMessageError.context.json()).error || sendMessageError.message}`);

    const { data: convoDetails, error: convoError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'get_conversation_details', settings: chatwootSettings, conversationId: conversationId } });
    if (convoError) throw new Error(`Lỗi lấy chi tiết hội thoại: ${(await convoError.context.json()).error || convoError.message}`);
    
    const newLabels = (convoDetails?.labels || []).filter((l: string) => l !== AI_STAR_LABEL_NAME);
    
    const { error: labelError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'update_labels', settings: chatwootSettings, conversationId: conversationId, labels: newLabels } });
    if (labelError) console.error("Lỗi cập nhật nhãn (không nghiêm trọng):", labelError.message);

    const { error: readError } = await supabaseAdmin.functions.invoke('chatwoot-proxy', { body: { action: 'mark_as_read', settings: chatwootSettings, conversationId: conversationId } });
    if (readError) console.error("Lỗi đánh dấu đã đọc (không nghiêm trọng):", readError.message);

    await logToDb('success', `AI đã trả lời thành công với nội dung: "${aiReply.substring(0, 100)}..."`, systemPrompt);

    return new Response(JSON.stringify({ message: `Successfully processed conversation ${conversationId}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (e) {
    console.error(`Failed to process conversation ${conversationId}:`, e.message);
    await sendErrorNote(e.message);
    await logToDb('error', e.message, systemPrompt);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } finally {
    await supabaseAdmin.from('ai_typing_status').upsert({ conversation_id: conversationId, is_typing: false });
  }
});