// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import pdf from 'https://esm.sh/pdf-parse@1.1.1'
// SỬA LỖI: Sử dụng 'node:' specifier để import Buffer một cách chính thống và tương thích.
import { Buffer } from "node:buffer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hàm chia nhỏ văn bản đơn giản để thay thế cho langchain
function splitText(text: string, { chunkSize, chunkOverlap }: { chunkSize: number; chunkOverlap: number }): string[] {
    if (chunkOverlap >= chunkSize) {
        throw new Error("chunkOverlap phải nhỏ hơn chunkSize.");
    }

    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.slice(i, end));
        i += chunkSize - chunkOverlap;
    }
    return chunks;
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

    // Bước 1: Tải tệp từ storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      throw new Error(`Lỗi tải file từ storage: ${downloadError.message}`);
    }

    // Chuyển đổi Blob thành ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    // Bước 2: Tạo một đối tượng Buffer từ ArrayBuffer
    const buffer = Buffer.from(arrayBuffer);

    // Bước 3: Phân tích PDF bằng pdf-parse, truyền trực tiếp buffer vào
    const pdfParsed = await pdf(buffer);
    const fullText = pdfParsed.text;
    
    const fileName = path.split('/').pop();

    // Lấy cài đặt API AI
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

    // Chia văn bản thành các đoạn nhỏ
    const chunks = splitText(fullText, {
      chunkSize: 500,
      chunkOverlap: 50,
    });

    // Tạo embedding cho các đoạn văn bản
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

    // Chèn vào cơ sở dữ liệu
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