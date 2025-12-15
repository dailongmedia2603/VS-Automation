// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { apiUrl, apiKey, model } = await req.json();
    
    if (!apiUrl) throw new Error("Base URL là bắt buộc (Ví dụ: https://chat.trollllm.xyz/v1).");
    if (!apiKey) throw new Error("API Key là bắt buộc.");

    // 1. Chuẩn hóa dữ liệu đầu vào (Quan trọng: trim() để tránh lỗi ByteString)
    const cleanApiKey = apiKey.trim(); 
    let cleanApiUrl = apiUrl.trim();

    // Loại bỏ dấu / ở cuối URL nếu có
    if (cleanApiUrl.endsWith('/')) {
        cleanApiUrl = cleanApiUrl.slice(0, -1);
    }

    // 2. Xây dựng Endpoint đúng chuẩn OpenAI
    // Logic: Nếu URL là "https://chat.trollllm.xyz/v1", ta nối thêm "/chat/completions"
    let endpoint = cleanApiUrl;
    if (!endpoint.endsWith('/chat/completions')) {
       endpoint = `${endpoint}/chat/completions`;
    }

    console.log(`Testing Troll LLM connection to: ${endpoint} with model: ${model}`);

    // 3. Cấu trúc Body theo chuẩn OpenAI (như mẫu CURL)
    const requestBody = {
      model: model || 'gemini-3-pro-preview', // Model mặc định là gemini
      messages: [
        { role: "user", content: "Xin chào, hãy trả lời ngắn gọn: Kết nối API có hoạt động ổn định không?" }
      ]
      // Có thể thêm max_tokens hoặc temperature nếu cần
    };

    // 4. Gửi Request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", responseText);
      throw new Error(`API trả về định dạng không hợp lệ: ${responseText.substring(0, 100)}...`);
    }

    // 5. Xử lý lỗi HTTP
    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.error || `Lỗi HTTP (${response.status})`;
      throw new Error(`Troll LLM Error: ${errorMsg}`);
    }

    // 6. Trích xuất dữ liệu phản hồi (Chuẩn OpenAI: choices[0].message.content)
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error("API trả về thành công nhưng không tìm thấy mảng 'choices'.");
    }

    const firstChoice = data.choices[0];
    if (!firstChoice.message || !firstChoice.message.content) {
      throw new Error("API trả về thành công nhưng không tìm thấy nội dung tin nhắn.");
    }

    const replyContent = firstChoice.message.content;

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Kết nối thành công!", 
      reply: replyContent,
      data: data // Trả về full data để debug
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Troll LLM:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})