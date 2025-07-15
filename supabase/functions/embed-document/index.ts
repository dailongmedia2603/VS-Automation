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
    const { document } = await req.json()
    if (!document || !document.content || !document.title) {
      throw new Error("Yêu cầu thiếu thông tin tài liệu (title, content).")
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

    // Combine relevant text fields for a richer embedding
    const textToEmbed = `Tiêu đề: ${document.title}\nMục đích: ${document.purpose || ''}\nNội dung: ${document.content}`;

    const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          input: textToEmbed,
          model: 'text-embedding-ada-002',
        }),
      })

    if (!embeddingResponse.ok) {
        const errorBody = await embeddingResponse.json();
        throw new Error(`Lỗi tạo embedding: ${errorBody.error.message}`);
    }

    const { data: [embeddingData] } = await embeddingResponse.json();
    const embedding = embeddingData.embedding;

    const documentToUpsert = {
        id: document.id, // for updates
        title: document.title,
        purpose: document.purpose,
        document_type: document.document_type,
        content: document.content,
        example_customer_message: document.example_customer_message,
        example_agent_reply: document.example_agent_reply,
        creator_name: document.creator_name,
        embedding: embedding,
    };

    const { data: upsertedDocument, error: upsertError } = await supabaseAdmin
      .from('documents')
      .upsert(documentToUpsert)
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Lỗi lưu vào cơ sở dữ liệu: ${upsertError.message}`)
    }

    return new Response(JSON.stringify(upsertedDocument), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})