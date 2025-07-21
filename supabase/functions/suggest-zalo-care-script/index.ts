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

    const { data: aiSettings, error: aiSettingsError } = await supabaseAdmin
      .from('ai_settings').select('api_url, api_key').eq('id', 1).single();
    if (aiSettingsError || !aiSettings) throw new Error("Không tìm thấy cấu hình AI.");

    const { data: promptConfig, error: promptError } = await supabaseAdmin
      .from('care_script_settings').select('config').eq('id', 1).single();
    if (promptError || !promptConfig || !promptConfig.config) throw new Error("Vui lòng cấu hình kịch bản chăm sóc trong trang Training Chatbot.");

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('zalo_messages').select('message_content, direction, created_at')
      .eq('threadId', threadId).order('created_at', { ascending: true });
    if (messagesError) throw messagesError;
    if (!messages || messages.length === 0) throw new Error("Không tìm thấy tin nhắn cho cuộc trò chuyện này.");

    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('zalo_user').select('displayName, zaloName').eq('userId', threadId).single();
    if (contactError) console.warn("Không tìm thấy tên Zalo cho threadId:", threadId);
    
    const conversationHistory = messages.map(formatMessage).join('\n');
    const contactName = contactData?.displayName || contactData?.zaloName || 'Khách hàng';

    let systemPrompt = JSON.stringify(promptConfig.config);
    systemPrompt = systemPrompt.replace(/{{current_date}}/g, new Date().toLocaleDateString('vi-VN'));
    systemPrompt = systemPrompt.replace(/{{contact_name}}/g, contactName);
    systemPrompt = systemPrompt.replace(/{{conversation_history}}/g, conversationHistory);
    
    // Add a strict instruction for JSON output
    systemPrompt += `\n\n**QUAN TRỌNG:** Chỉ trả lời bằng một đối tượng JSON hợp lệ duy nhất, không có bất kỳ văn bản nào khác. Định dạng phải là: {"content": "nội dung tin nhắn", "scheduled_at": "YYYY-MM-DDTHH:mm:ss.sssZ"}`;

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

    const aiContent = proxyResponse.choices[0].message.content;
    const jsonString = aiContent.replace(/```json\n|```/g, '').trim();
    const suggestion = JSON.parse(jsonString);

    return new Response(JSON.stringify(suggestion), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Lỗi trong function suggest-zalo-care-script:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});