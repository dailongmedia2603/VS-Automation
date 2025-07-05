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

    // Logic xử lý lỗi mạnh mẽ
    if (!response.ok) {
        let errorBody;
        try {
            // Ưu tiên đọc lỗi dạng JSON
            errorBody = await response.json();
        } catch {
            // Nếu thất bại, đọc lỗi dạng văn bản thuần
            errorBody = await response.text();
        }
        
        const errorMessage = (typeof errorBody === 'object' && errorBody?.error?.message) 
                           ? errorBody.error.message 
                           : (typeof errorBody === 'string' && errorBody.trim() !== '')
                           ? errorBody
                           : `API request failed with status ${response.status}`;

        console.error(`Upstream API Error (${response.status}):`, errorBody);
        throw new Error(errorMessage);
    }

    // Nếu thành công, chúng ta vẫn cần đảm bảo phản hồi là JSON hợp lệ
    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error("Failed to parse successful response as JSON:", e);
        throw new Error("Received a successful but invalid response from the API.");
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Khối catch này sẽ bắt tất cả các lỗi và luôn trả về một JSON hợp lệ
    console.error(`Edge Function Error: ${error.message}`);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})