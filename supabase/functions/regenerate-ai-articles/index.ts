// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatMapping: Record<string, string> = {
  question: 'Đặt câu hỏi / thảo luận',
  review: 'Review',
  sharing: 'Chia sẻ',
  comparison: 'So sánh',
  storytelling: 'Story telling',
};

const buildBasePrompt = (libraryConfig, documentContext) => {
  const config = libraryConfig || {};
  
  const safetyInstructionBlock = config.safety_instruction 
    ? { title: 'CHỈ THỊ AN TOÀN (ƯU TIÊN CAO NHẤT)', content: config.safety_instruction }
    : null;

  const trainingInfoContent = [
    `- **Vai trò của bạn:** ${config.role || '(Chưa cung cấp)'}`,
    `- **Lĩnh vực kinh doanh:** ${config.industry || '(Chưa cung cấp)'}`,
    `- **Phong cách:** ${config.style || '(Chưa cung cấp)'}`,
    `- **Tông giọng:** ${config.tone || '(Chưa cung cấp)'}`,
    `- **Ngôn ngữ:** ${config.language || '(Chưa cung cấp)'}`,
    `- **Mục tiêu cần đạt:** ${config.goal || '(Chưa cung cấp)'}`
  ].join('\n');
  
  let promptStructure = [
    { title: 'YÊU CẦU VIẾT NỘI DUNG TỰ NHIÊN NHƯ NGƯỜI THẬT', content: 'Bạn là một trợ lý AI viết nội dung bài viết / comment tự nhiên như người dùng thật. Hãy dựa vào các thông tin dưới đây để xây dựng nội dung chất lượng và tự nhiên nhé.' },
    { title: 'THÔNG TIN HUẤN LUYỆN CHUNG', content: trainingInfoContent },
    { title: 'TÀI LIỆU NỘI BỘ THAM KHẢO', content: '{{document_context}}' },
    { title: 'HÀNH ĐỘNG', content: 'Dựa vào TOÀN BỘ thông tin, hãy tạo nội dung đúng yêu cầu, tự nhiên như người thật, không được có dấu hiệu máy móc, khô cứng, seeding' }
  ];

  if (safetyInstructionBlock) {
    promptStructure.unshift(safetyInstructionBlock);
  }

  const dataMap = {
    '{{document_context}}': documentContext || '(Không có tài liệu tham khảo liên quan)',
  };
  return promptStructure.map(block => {
    let content = block.content;
    for (const [key, value] of Object.entries(dataMap)) {
      content = content.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }
    return `### ${block.title.toUpperCase()}\n\n${content}`;
  }).join('\n\n---\n\n');
};

const buildRegenerationPrompt = (basePrompt, config, originalArticle, feedback) => {
  const conditionsText = (config.mandatoryConditions || []).map(c => `- ${c.content}`).join('\n');
  let structureText = '';
  if (config.structure && config.structure.structure_content) {
    structureText = `---
**CẤU TRÚC BÀI VIẾT BẮT BUỘC:**
AI phải tuân thủ TUYỆT ĐỐI cấu trúc sau đây khi viết bài:
${config.structure.structure_content}
---`;
  }
  let wordCountText = '';
  if (config.wordCount && Number(config.wordCount) > 0) {
    wordCountText = `---
**ĐỘ DÀI BÀI VIẾT:**
Bài viết phải có độ dài khoảng ${config.wordCount} từ. Cho phép chênh lệch trong khoảng +/- 10%.
---`;
  }
  let referenceExampleText = '';
  if (config.referenceExample && config.referenceExample.trim() !== '') {
    referenceExampleText = `
**Ví dụ tham khảo (Về văn phong, giọng điệu):**
${config.referenceExample}`;
  }
  const translatedFormat = formatMapping[config.format] || config.format || 'Không có';

  return `
    ${basePrompt}
    ---
    **BÀI VIẾT GỐC CẦN CHỈNH SỬA:**
    ${originalArticle.content}
    ---
    **YÊU CẦU CHỈNH SỬA (FEEDBACK TỪ NGƯỜI DÙNG):**
    "${feedback}"
    ---
    **THÔNG TIN CHI TIẾT (GIỮ NGUYÊN):**
    **Dạng bài:** ${translatedFormat}
    **Định hướng nội dung chi tiết:** ${config.direction || 'Không có'}
    ${referenceExampleText}
    ${structureText}
    ${wordCountText}
    ---
    **ĐIỀU KIỆN BẮT BUỘC (QUAN TRỌNG NHẤT):**
    AI phải tuân thủ TUYỆT ĐỐI tất cả các điều kiện sau đây:
    ${conditionsText || 'Không có điều kiện nào.'}
    ---
    **YÊU CẦU MỚI:** Dựa vào **FEEDBACK TỪ NGƯỜI DÙNG** và toàn bộ thông tin trên, hãy **VIẾT LẠI DUY NHẤT MỘT BÀI VIẾT** tốt hơn. Chỉ trả về nội dung bài viết, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay tiêu đề không cần thiết nào.
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const { itemId, feedback, articleIdsToRegenerate } = await req.json();
  if (!itemId || !feedback || !articleIdsToRegenerate) {
    return new Response(JSON.stringify({ error: "Thiếu thông tin cần thiết." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '').auth.getUser(jwt);
    if (!user) throw new Error("User not authenticated.");

    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('config, content').eq('id', itemId).single();
    if (itemError || !item) throw new Error("Không tìm thấy mục tương ứng.");

    const existingArticles = JSON.parse(item.content || '[]');
    const { config } = item;
    const { libraryId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('custom_gemini_api_url, custom_gemini_api_key')
      .eq('id', 1)
      .single();

    if (settingsError || !aiSettings || !aiSettings.custom_gemini_api_url || !aiSettings.custom_gemini_api_key) {
      throw new Error("API Gemini Custom chưa được cấu hình trong Cài đặt chung.");
    }
    const { custom_gemini_api_url: apiUrl, custom_gemini_api_key: token } = aiSettings;

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt.");

    let documentContext = '';
    const { relatedDocumentIds } = config;

    if (relatedDocumentIds && Array.isArray(relatedDocumentIds) && relatedDocumentIds.length > 0) {
      const { data: selectedDocs, error: docsError } = await supabaseAdmin
        .from('documents')
        .select('title, content')
        .in('id', relatedDocumentIds);

      if (docsError) {
        console.warn("Could not fetch selected documents:", docsError.message);
      } else if (selectedDocs && selectedDocs.length > 0) {
        documentContext = selectedDocs.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n');
      }
    }

    const basePrompt = buildBasePrompt(library.config, documentContext);

    const regenerationPromises = articleIdsToRegenerate.map(async (articleId: string) => {
      const originalArticle = existingArticles.find((a: any) => a.id === articleId);
      if (!originalArticle) return null;

      const finalPrompt = buildRegenerationPrompt(basePrompt, config, originalArticle, feedback);
      
      const body = new URLSearchParams();
      body.append('prompt', finalPrompt);
      body.append('token', token);

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      const responseText = await apiResponse.text();
      if (!apiResponse.ok) {
        throw new Error(`Lỗi API Gemini Custom: ${responseText}`);
      }

      let responseData;
      try {
          responseData = JSON.parse(responseText);
      } catch (e) {
          throw new Error(`Phản hồi từ API không phải là JSON hợp lệ: ${responseText}`);
      }

      if (!responseData.success || typeof responseData.answer === 'undefined') {
          throw new Error(`API trả về lỗi hoặc định dạng không mong đợi: ${responseData.message || responseText}`);
      }

      const rawContent = responseData.answer;
      const responseForLog = responseData;
      
      await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: user.id, prompt: finalPrompt, response: responseForLog });
      
      return { ...originalArticle, content: rawContent.trim() };
    });

    const regeneratedArticles = (await Promise.all(regenerationPromises)).filter(Boolean);

    const newResults = existingArticles.map((article: any) => {
      const regenerated = regeneratedArticles.find(r => r.id === article.id);
      return regenerated || article;
    });

    await supabaseAdmin
      .from('content_ai_items')
      .update({ 
        content: JSON.stringify(newResults), 
        updated_at: new Date().toISOString(),
        generation_status: 'idle',
        generation_error: null
      })
      .eq('id', itemId);
    
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await supabaseAdmin
      .from('content_ai_items')
      .update({
        generation_status: 'failed',
        generation_error: error.message
      })
      .eq('id', itemId);

    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});