// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- search-documents function started (v2 - Gemini) ---");
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

    // Use Google Gemini API key for consistency
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
    
    // Directly call the embed-document function to get the embedding
    const { data: embeddingResponse, error: embeddingError } = await supabaseAdmin.functions.invoke('embed-document', {
        body: { textToEmbed: query }
    });

    if (embeddingError) {
        const errorBody = await embeddingError.context.json();
        throw new Error(`Lỗi gọi embed-document: ${errorBody.error || embeddingError.message}`);
    }
    if (embeddingResponse.error) throw new Error(`Lỗi từ embed-document: ${embeddingResponse.error}`);
    if (!embeddingResponse.embedding) {
        console.error("Invalid response from embed-document:", embeddingResponse);
        throw new Error('Phản hồi từ embed-document không chứa embedding hợp lệ.');
    }

    const queryEmbedding = embeddingResponse.embedding;
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