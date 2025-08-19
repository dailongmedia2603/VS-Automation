// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- embed-document function started (v2 - Gemini) ---");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textToEmbed } = await req.json()
    if (!textToEmbed) {
      throw new Error("Yêu cầu thiếu 'textToEmbed'.")
    }
    console.log("Received text to embed:", textToEmbed.substring(0, 100) + "...");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use Google Gemini API key for consistency with the rest of the app
    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('google_gemini_api_key')
      .eq('id', 1)
      .single()

    if (settingsError || !aiSettings || !aiSettings.google_gemini_api_key) {
      console.error("AI settings error:", settingsError);
      throw new Error('Vui lòng cấu hình API Google Gemini trong trang Cài đặt API AI.')
    }
    console.log("Gemini AI settings loaded successfully.");

    const apiKey = aiSettings.google_gemini_api_key;
    const model = 'embedding-001'; // A standard Gemini embedding model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text: textToEmbed }],
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData?.error?.message || `Lỗi API với mã trạng thái ${response.status}.`;
      console.error("Gemini embedding API error:", errorMessage, responseData);
      throw new Error(errorMessage);
    }

    const embedding = responseData?.embedding?.values;
    if (!embedding) {
      console.error("Invalid response from Gemini embedding API:", responseData);
      throw new Error('Phản hồi từ API không chứa embedding hợp lệ.');
    }

    console.log("Successfully extracted embedding. Vector length:", embedding.length);

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("--- embed-document function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})