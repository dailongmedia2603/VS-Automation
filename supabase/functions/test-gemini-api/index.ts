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
    const { apiKey } = await req.json();
    if (!apiKey) {
      throw new Error("Vui lòng cung cấp API Key.");
    }

    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const response = await fetch(testUrl);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Yêu cầu thất bại với mã trạng thái ${response.status}.`;
      throw new Error(errorMessage);
    }

    if (!data.models || data.models.length === 0) {
        throw new Error("API Key hợp lệ nhưng không tìm thấy model nào.");
    }

    return new Response(JSON.stringify({ success: true, message: "Kết nối thành công!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Gemini API connection:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})