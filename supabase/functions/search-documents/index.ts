// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    if (!query) {
      throw new Error("Yêu cầu thiếu 'query'.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('api_key, api_url')
      .eq('id', 1)
      .single()

    if (settingsError || !aiSettings || !aiSettings.api_key || !aiSettings.api_url) {
      throw new Error('Không tìm thấy hoặc không đầy đủ thông tin API trong cài đặt.')
    }
    
    const openAIApiKey = aiSettings.api_key;
    
    // Correctly derive the embeddings endpoint from the provided API URL
    const apiUrl = aiSettings.api_url;
    const v1Index = apiUrl.lastIndexOf('/v1/');
    const baseUrl = v1Index !== -1 ? apiUrl.substring(0, v1Index + 3) : apiUrl.replace(/\/$/, '');
    const embeddingUrl = `${baseUrl}/embeddings`;

    // Tạo embedding cho câu truy vấn
    const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          input: query,
          model: 'text-embedding-3-small',
        }),
      })

    if (!embeddingResponse.ok) {
        const errorBody = await embeddingResponse.json();
        throw new Error(`Lỗi tạo embedding cho câu truy vấn: ${errorBody.error.message}`);
    }

    const { data: [embeddingData] } = await embeddingResponse.json();

    // Tìm kiếm trong cơ sở dữ liệu vector
    const { data: documents, error: matchError } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: embeddingData.embedding,
      match_threshold: 0.78, // Ngưỡng tương đồng, có thể điều chỉnh
      match_count: 5, // Số lượng kết quả trả về
    })

    if (matchError) {
      throw new Error(`Lỗi tìm kiếm tài liệu: ${matchError.message}`)
    }

    return new Response(JSON.stringify(documents), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})