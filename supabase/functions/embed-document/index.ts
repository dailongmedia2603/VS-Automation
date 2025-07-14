// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RecursiveCharacterTextSplitter } from 'https://esm.sh/langchain/text_splitter'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, fileName } = await req.json()
    if (!text || !fileName) {
      throw new Error("Yêu cầu thiếu 'text' hoặc 'fileName'.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Lấy API key từ cài đặt
    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('api_key, api_url')
      .eq('id', 1)
      .single()

    if (settingsError || !aiSettings || !aiSettings.api_key || !aiSettings.api_url) {
      throw new Error('Không tìm thấy hoặc không đầy đủ thông tin API trong cài đặt.')
    }
    
    const openAIApiKey = aiSettings.api_key;
    // Giả định endpoint embedding, cần điều chỉnh nếu nhà cung cấp khác
    const embeddingUrl = `${aiSettings.api_url.replace(/\/v1\/?$/, '')}/v1/embeddings`;

    // Chia văn bản thành các đoạn nhỏ
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    })
    const chunks = await splitter.splitText(text)

    // Tạo embeddings cho các đoạn văn bản
    const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          input: chunks,
          model: 'text-embedding-3-small', // Model embedding mặc định
        }),
      })

    if (!embeddingResponse.ok) {
        const errorBody = await embeddingResponse.json();
        throw new Error(`Lỗi tạo embedding: ${errorBody.error.message}`);
    }

    const { data: embeddings } = await embeddingResponse.json();

    const documentsToInsert = chunks.map((chunk, i) => ({
      content: chunk,
      embedding: embeddings[i].embedding,
      metadata: { file_name: fileName },
    }))

    // Lưu vào cơ sở dữ liệu
    const { error: insertError } = await supabaseAdmin.from('documents').insert(documentsToInsert)
    if (insertError) {
      throw new Error(`Lỗi lưu vào cơ sở dữ liệu: ${insertError.message}`)
    }

    return new Response(JSON.stringify({ message: `Đã xử lý và lưu trữ thành công ${chunks.length} đoạn.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})