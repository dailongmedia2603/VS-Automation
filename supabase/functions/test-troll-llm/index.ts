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
    
    if (!apiUrl || !apiKey) {
      throw new Error("API URL và API Key là bắt buộc.");
    }

    // Chuẩn hóa input: xóa khoảng trắng thừa, xuống dòng
    const cleanApiUrl = apiUrl.trim();
    const cleanApiKey = apiKey.trim();

    // Chuẩn hóa URL: đảm bảo không có dấu / ở cuối
    const baseUrl = cleanApiUrl.endsWith('/') ? cleanApiUrl.slice(0, -1) : cleanApiUrl;
    const endpoint = `${baseUrl}/chat/completions`;

    console.log(`Testing Troll LLM connection to: ${endpoint} with model: ${model}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        model: model || 'gemini-3-pro-preview',
        messages: [
          { role: "user", content: "Hello, are you active?" }
        ],
        max_tokens: 10
      })
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // Nếu không parse được JSON, trả về text gốc để debug
      throw new Error(`API trả về định dạng không hợp lệ: ${responseText.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || `Lỗi API (${response.status}): ${responseText}`);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("API trả về thành công nhưng không có nội dung phản hồi.");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Kết nối thành công!", 
      data: data 
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