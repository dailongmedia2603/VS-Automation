// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_URL = 'https://multiappai.itmovnteam.com/api/v1/chat/completions';

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

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo',
            messages: messages,
            max_tokens: 2048,
            stream: false,
        }),
    });

    // Đọc phản hồi MỘT LẦN DUY NHẤT và lưu vào biến 'data'
    const data = await response.json();

    // Bây giờ, kiểm tra lỗi DỰA TRÊN PHẢN HỒI ĐÃ ĐỌC
    if (!response.ok) {
        // Lấy thông báo lỗi từ biến 'data' đã có
        const errorMessage = data?.error?.message || `API request failed with status ${response.status}`;
        console.error(`Upstream API Error:`, data);
        throw new Error(errorMessage);
    }

    // Nếu không có lỗi, trả về dữ liệu đã đọc
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`Edge Function Error: ${error.message}`);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})