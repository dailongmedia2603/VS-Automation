// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- search-documents function started ---");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query) {
      throw new Error("Yêu cầu thiếu 'query'.")
    }
    console.log("Received query:", query);

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
    
    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
        body: {
            input: query,
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

    const queryEmbedding = proxyResponse.data[0].embedding;
    console.log("Successfully got query embedding.");

    const { data: documents, error: matchError } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 10,
    })

    if (matchError) {
      console.error("Document match error:", matchError);
      throw new Error(`Lỗi tìm kiếm tài liệu: ${matchError.message}`)
    }

    console.log(`Found ${documents.length} matching documents.`);
    return new Response(JSON.stringify(documents), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("--- search-documents function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})