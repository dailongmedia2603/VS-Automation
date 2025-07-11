// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_URL = 'https://multiappai-api.itmovnteam.com/api/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('MULTI_APP_AI_KEY');
    if (!apiKey) {
      throw new Error('API key (MULTI_APP_AI_KEY) is not set in Supabase secrets.');
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Missing or invalid "messages" in request body.');
    }

    const upstreamResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o', // Đã cập nhật model
            messages: messages,
            max_tokens: 2048,
            stream: false,
        }),
    });

    // Đọc toàn bộ nội dung phản hồi dưới dạng văn bản MỘT LẦN DUY NHẤT.
    const responseText = await upstreamResponse.text();
    
    let data;
    try {
        // Cố gắng phân tích văn bản đã đọc thành JSON.
        data = JSON.parse(responseText);
    } catch (e) {
        // Nếu thất bại, có nghĩa là phản hồi không phải là JSON hợp lệ.
        console.error("Failed to parse response as JSON. Raw response text:", responseText);
        // Chúng ta vẫn trả về lỗi dựa trên mã trạng thái gốc.
        if (!upstreamResponse.ok) {
             throw new Error(`API request failed with status ${upstreamResponse.status}: ${responseText}`);
        }
        // Trường hợp hiếm: mã trạng thái thành công nhưng nội dung không phải JSON.
        throw new Error("Received a successful but non-JSON response from the API.");
    }

    // Bây giờ, kiểm tra mã trạng thái của phản hồi gốc.
    if (!upstreamResponse.ok) {
        const errorMessage = data?.error?.message || `API request failed with status ${upstreamResponse.status}`;
        console.error(`Upstream API Error (${upstreamResponse.status}):`, data);
        throw new Error(errorMessage);
    }

    // Nếu mọi thứ ổn, trả về dữ liệu đã phân tích.
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Khối catch này sẽ bắt tất cả các lỗi và luôn trả về một JSON hợp lệ.
    console.error(`Edge Function Error: ${error.message}`);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})