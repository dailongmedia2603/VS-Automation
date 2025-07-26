// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- embed-document function started ---");
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

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('api_url, api_key, embedding_model_name')
      .eq('id', 1)
      .single()

    if (settingsError || !aiSettings || !aiSettings.api_key || !aiSettings.api_url) {
      console.error("AI settings error:", settingsError);
      throw new Error('Vui lòng cấu hình API trong trang Cài đặt API AI.')
    }
    console.log("AI settings loaded successfully.");

    console.log("Calling multi-ai-proxy with model:", aiSettings.embedding_model_name);
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
        body: {
            input: textToEmbed,
            apiUrl: aiSettings.api_url,
            apiKey: aiSettings.api_key,
            embeddingModelName: aiSettings.embedding_model_name,
        }
    });

    if (proxyError) {
        const errorBody = await proxyError.context.json();
        throw new Error(`Lỗi gọi AI Proxy: ${errorBody.error || proxyError.message}`);
    }
    if (proxyResponse.error) throw new Error(`Lỗi từ AI Proxy: ${proxyResponse.error}`);
    if (!proxyResponse.data || !proxyResponse.data[0] || !proxyResponse.data[0].embedding) {
        console.error("Invalid response from proxy:", proxyResponse);
        throw new Error('Phản hồi từ proxy không chứa embedding hợp lệ.');
    }

    const embedding = proxyResponse.data[0].embedding;
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