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
      .select('api_url, api_key, embedding_model_name')
      .eq('id', 1)
      .single()

    if (settingsError || !aiSettings || !aiSettings.api_key || !aiSettings.api_url) {
      throw new Error('Vui lòng cấu hình API trong trang Cài đặt API AI.')
    }
    
    const textToEmbed = `Tiêu đề: ${document.title}\nMục đích: ${document.purpose || ''}\nNội dung: ${document.content}`;

    const { data: proxyResponse, error: proxyError } = await supabaseAdmin.functions.invoke('multi-ai-proxy', {
        body: {
            input: textToEmbed,
            apiUrl: aiSettings.api_url,
            apiKey: aiSettings.api_key,
            embeddingModelName: aiSettings.embedding_model_name,
        }
    });

    if (proxyError) throw new Error(`Lỗi gọi AI Proxy: ${(await proxyError.context.json()).error || proxyError.message}`);
    if (proxyResponse.error) throw new Error(`Lỗi từ AI Proxy: ${proxyResponse.error}`);
    if (!proxyResponse.data || !proxyResponse.data[0] || !proxyResponse.data[0].embedding) {
        throw new Error('Phản hồi từ proxy không chứa embedding hợp lệ.');
    }

    const embedding = proxyResponse.data[0].embedding;

    const documentData = {
        title: document.title,
        purpose: document.purpose,
        document_type: document.document_type,
        content: document.content,
        example_customer_message: document.example_customer_message,
        example_agent_reply: document.example_agent_reply,
        creator_name: document.creator_name,
        embedding: embedding,
    };

    let savedDocument;

    if (document.id) {
      // UPDATE LOGIC
      const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update(documentData)
        .eq('id', document.id);
      
      if (updateError) {
        throw new Error(`Lỗi cập nhật cơ sở dữ liệu: ${updateError.message}`);
      }

      const { data: updatedData, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', document.id)
        .single();
      
      if (fetchError) {
        throw new Error(`Lỗi lấy dữ liệu sau khi cập nhật: ${fetchError.message}`);
      }
      savedDocument = updatedData;

    } else {
      // INSERT LOGIC
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('documents')
        .insert(documentData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Lỗi thêm mới vào cơ sở dữ liệu: ${insertError.message}`);
      }
      if (!insertedData || !insertedData.id) {
        throw new Error('Không thể lấy ID của tài liệu vừa tạo.');
      }

      const { data: newDocument, error: fetchError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', insertedData.id)
        .single();

      if (fetchError) {
        throw new Error(`Lỗi lấy dữ liệu sau khi thêm mới: ${fetchError.message}`);
      }
      savedDocument = newDocument;
    }

    return new Response(JSON.stringify(savedDocument), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})