// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatMessage = (msg) => {
    const sender = msg.message_type === 1 ? 'Agent' : 'User'; // 1 is outgoing, 0 is incoming
    const timestamp = new Date(msg.created_at_chatwoot).toLocaleString('vi-VN');
    const content = msg.content || '[Tệp đính kèm hoặc tin nhắn trống]';
    return `[${timestamp}] ${sender}: ${content}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversationId } = await req.json();
    if (!conversationId) throw new Error("Yêu cầu thiếu ID cuộc trò chuyện.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Lấy cấu hình AI
    const { data: aiSettings, error: aiSettingsError } = await supabaseAdmin
      .from('ai_settings').select('api_url, api_key').eq('id', 1).single();
    if (aiSettingsError || !aiSettings) throw new Error("Không tìm thấy cấu hình AI.");

    // 2. Lấy dữ liệu cuộc trò chuyện
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chatwoot_messages').select('content, message_type, created_at_chatwoot')
      .eq('conversation_id', conversationId).order('created_at_chatwoot', { ascending: true });
    if (messagesError) throw messagesError;
    if (!messages || messages.length === 0) throw new Error("Không tìm thấy tin nhắn cho cuộc trò chuyện này.");

    const { data: convData, error: convError } = await supabaseAdmin
      .from('chatwoot_conversations').select('contact_id').eq('id', conversationId).single();
    if (convError) throw convError;

    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('chatwoot_contacts').select('name').eq('id', convData.contact_id).single();
    if (contactError) throw contactError;
    
    const conversationHistory = messages.map(formatMessage).join('\n');
    const contactName = contactData.name || 'Khách hàng';

    // 3. Xây dựng prompt cho AI
    const systemPrompt = `Bạn là một trợ lý chăm sóc khách hàng chuyên nghiệp. Nhiệm vụ của bạn là phân tích một cuộc trò chuyện và đề xuất một tin nhắn theo dõi cùng thời gian gửi phù hợp. Mục tiêu là tái tương tác với khách hàng, cung cấp giá trị, hoặc đưa họ đến bước tiếp theo. Ngày hiện tại là ${new Date().toLocaleDateString('vi-VN')}.

Tên khách hàng là ${contactName}.

Hãy phân tích lịch sử trò chuyện sau:
---
${conversationHistory}
---

Dựa vào cuộc trò chuyện này, hãy đề xuất một tin nhắn theo dõi được cá nhân hóa, không gây khó chịu. Tin nhắn phải thân thiện, hữu ích và viết bằng tiếng Việt.
Đồng thời, đề xuất một ngày và giờ cụ thể trong tương lai để gửi tin nhắn này. Hãy xem xét giờ hành chính (9h - 17h) và bối cảnh cuộc trò chuyện. Nếu cuộc trò chuyện đã nguội lạnh, một tin nhắn sau 3-5 ngày có thể phù hợp.

Phản hồi của bạn BẮT BUỘC phải là một đối tượng JSON hợp lệ với cấu trúc sau và không có gì khác:
{
  "content": "Nội dung tin nhắn đề xuất bằng tiếng Việt.",
  "scheduled_at": "Một ngày và giờ trong tương lai theo định dạng ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)."
}`;

    // 4. Gọi proxy AI
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
      body: {
        messages: [{ role: 'system', content: systemPrompt }],
        apiUrl: aiSettings.api_url,
        apiKey: aiSettings.api_key,
        model: 'gpt-4o'
      }
    });

    if (proxyError) throw new Error(proxyError.message || 'Gọi function thất bại');
    if (proxyResponse.error) throw new Error(proxyResponse.error);

    // 5. Xử lý và trả về phản hồi của AI
    const aiContent = proxyResponse.choices[0].message.content;
    const jsonString = aiContent.replace(/```json\n|```/g, '').trim();
    const suggestion = JSON.parse(jsonString);

    return new Response(JSON.stringify(suggestion), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Lỗi trong function suggest-care-script:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});