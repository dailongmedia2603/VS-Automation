// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatMessage = (msg) => {
    const sender = msg.direction === 'out' ? 'Agent' : 'User';
    const timestamp = new Date(msg.created_at).toLocaleString('vi-VN');
    const content = msg.message_content || '[Tệp đính kèm hoặc tin nhắn trống]';
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

  let finalPrompt = config.promptTemplate.map(block => {
    let content = block.content;
    for (const [key, value] of Object.entries(dataMap)) {
      content = content.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }
    return `# ${block.title.toUpperCase()}\n${content}`;
  }).join('\n\n');

  // Add a strict instruction for JSON output
  finalPrompt += `\n\n**QUAN TRỌNG:** Chỉ trả lời bằng một đối tượng JSON hợp lệ duy nhất, không có bất kỳ văn bản nào khác. Định dạng phải là: {"content": "nội dung tin nhắn", "scheduled_at": "YYYY-MM-DDTHH:mm:ss.sssZ"}`;

  return finalPrompt;
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { threadId } = await req.json();
    if (!threadId) throw new Error("Yêu cầu thiếu ID cuộc trò chuyện (threadId).");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch all necessary settings and data in parallel
    const [aiSettingsRes, careScriptSettingsRes, messagesRes, contactRes] = await Promise.all([
      supabaseAdmin.from('ai_settings').select('api_url, api_key').eq('id', 1).single(),
      supabaseAdmin.from('care_script_settings').select('config').eq('id', 1).single(),
      supabaseAdmin.from('zalo_messages').select('message_content, direction, created_at').eq('threadId', threadId).order('created_at', { ascending: true }),
      supabaseAdmin.from('zalo_user').select('displayName, zaloName').eq('userId', threadId).single()
    ]);

    if (aiSettingsRes.error || !aiSettingsRes.data) throw new Error("Không tìm thấy cấu hình AI.");
    if (careScriptSettingsRes.error || !careScriptSettingsRes.data || !careScriptSettingsRes.data.config) throw new Error("Vui lòng cấu hình kịch bản chăm sóc trong trang Training Chatbot Zalo.");
    if (messagesRes.error) throw messagesRes.error;
    if (!messagesRes.data || messagesRes.data.length === 0) throw new Error("Không tìm thấy tin nhắn cho cuộc trò chuyện này.");

    const aiSettings = aiSettingsRes.data;
    const trainingConfig = careScriptSettingsRes.data.config;
    const messages = messagesRes.data;
    const contactData = contactRes.data;

    // 2. Process conversation data
    const conversationHistory = messages.map(formatMessage).join('\n');
    const contactName = contactData?.displayName || contactData?.zaloName || 'Khách hàng';
    const lastUserMessage = messages.filter(m => m.direction === 'in').pop()?.message_content || '';

    // 3. Search for relevant documents
    let context = null;
    if (lastUserMessage) {
        const richQuery = `
          Bối cảnh kinh doanh: ${trainingConfig.industry || 'Không rõ'}.
          Sản phẩm/dịch vụ chính: ${trainingConfig.products && trainingConfig.products.length > 0 ? trainingConfig.products.map(p => p.value).join(', ') : 'Không rõ'}.
          Câu hỏi của khách hàng: ${lastUserMessage}
        `.trim().replace(/\s+/g, ' ');

        const { data: searchResults, error: searchError } = await supabaseAdmin.functions.invoke('search-documents', {
            body: { query: richQuery }
        });
        if (searchError) console.error("Lỗi tìm kiếm tài liệu:", searchError.message);
        else context = searchResults;
    }

    // 4. Build the dynamic system prompt
    const systemPrompt = buildDynamicSystemPrompt(trainingConfig, conversationHistory, context);

    // 5. Call the AI proxy
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: {
        messages: [{ role: 'system', content: systemPrompt }],
        apiUrl: aiSettings.api_url,
        apiKey: aiSettings.api_key,
        model: 'gpt-4o'
      }
    });

    if (proxyError) throw new Error((await proxyError.context.json()).error || proxyError.message);
    if (proxyResponse.error) throw new Error(proxyResponse.error);

    // 6. Parse and return the suggestion
    const aiContent = proxyResponse.choices[0].message.content;
    const jsonString = aiContent.replace(/```json\n|```/g, '').trim();
    const suggestion = JSON.parse(jsonString);

    return new Response(JSON.stringify(suggestion), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Lỗi trong function suggest-zalo-care-script:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});