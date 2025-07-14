// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RecursiveCharacterTextSplitter } from 'https://esm.sh/langchain/text_splitter'
import * as pdfjs from 'https://esm.sh/pdfjs-dist@4.4.170'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bucket, path } = await req.json();
    if (!bucket || !path) {
      throw new Error("Yêu cầu thiếu 'bucket' hoặc 'path'.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      throw new Error(`Lỗi tải file từ storage: ${downloadError.message}`);
    }

    // Convert Blob to ArrayBuffer and use pdfjs-dist
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8array = new Uint8Array(arrayBuffer);
    const pdf = await pdfjs.getDocument(uint8array).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    const fileName = path.split('/').pop();

    // Get AI API settings
    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('api_key, api_url')
      .eq('id', 1)
      .single();

    if (settingsError || !aiSettings || !aiSettings.api_key || !aiSettings.api_url) {
      throw new Error('Không tìm thấy hoặc không đầy đủ thông tin API trong cài đặt.');
    }
    
    const openAIApiKey = aiSettings.api_key;
    const embeddingUrl = `${aiSettings.api_url.replace(/\/v1\/?$/, '')}/v1/embeddings`;

    // Split the text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const chunks = await splitter.splitText(fullText);

    // Create embeddings for the chunks
    const embeddingResponse = await fetch(embeddingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: JSON.stringify({
          input: chunks,
          model: 'text-embedding-3-small',
        }),
      });

    if (!embeddingResponse.ok) {
        const errorBody = await embeddingResponse.json();
        throw new Error(`Lỗi tạo embedding: ${errorBody.error.message}`);
    }

    const { data: embeddings } = await embeddingResponse.json();

    const documentsToInsert = chunks.map((chunk, i) => ({
      content: chunk,
      embedding: embeddings[i].embedding,
      metadata: { file_name: fileName },
    }));

    // Insert into the database
    const { error: insertError } = await supabaseAdmin.from('documents').insert(documentsToInsert);
    if (insertError) {
      throw new Error(`Lỗi lưu vào cơ sở dữ liệu: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ message: `Đã xử lý và lưu trữ thành công ${chunks.length} đoạn từ ${fileName}.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});