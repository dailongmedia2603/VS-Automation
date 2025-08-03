// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const buildBasePrompt = (libraryConfig, documentContext) => {
  const config = libraryConfig || {};
  const trainingInfoContent = [
    `- **Vai trò của bạn:** ${config.role || '(Chưa cung cấp)'}`,
    `- **Lĩnh vực kinh doanh:** ${config.industry || '(Chưa cung cấp)'}`,
    `- **Phong cách:** ${config.style || '(Chưa cung cấp)'}`,
    `- **Tông giọng:** ${config.tone || '(Chưa cung cấp)'}`,
    `- **Ngôn ngữ:** ${config.language || '(Chưa cung cấp)'}`,
    `- **Mục tiêu cần đạt:** ${config.goal || '(Chưa cung cấp)'}`
  ].join('\n');
  const promptStructure = [
    { title: 'YÊU CẦU VIẾT NỘI DUNG TỰ NHIÊN NHƯ NGƯỜI THẬT', content: 'Bạn là một trợ lý AI viết nội dung bài viết / comment tự nhiên như người dùng thật. Hãy dựa vào các thông tin dưới đây để xây dựng nội dung chất lượng và tự nhiên nhé.' },
    { title: 'THÔNG TIN HUẤN LUYỆN CHUNG', content: trainingInfoContent },
    { title: 'TÀI LIỆU NỘI BỘ THAM KHẢO', content: '{{document_context}}' },
    { title: 'HÀNH ĐỘNG', content: 'Dựa vào TOÀN BỘ thông tin, hãy tạo nội dung đúng yêu cầu, tự nhiên như người thật, không được có dấu hiệu máy móc, khô cứng, seeding' }
  ];
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
  const dangBai = config.structure?.name || config.format || 'Không có';

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
    **Dạng bài:** ${dangBai}
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

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const { itemId, feedback, existingArticles, articleIdsToRegenerate } = await req.json();
    if (!itemId || !feedback || !existingArticles || !articleIdsToRegenerate) {
      throw new Error("Thiếu thông tin cần thiết.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '').auth.getUser(jwt);
    if (!user) throw new Error("User not authenticated.");

    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('config').eq('id', itemId).single();
    if (itemError || !item) throw new Error("Không tìm thấy mục tương ứng.");

    const { config } = item;
    const { libraryId, direction, structureId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    if (structureId) {
      const { data: structure, error: structError } = await supabaseAdmin
        .from('article_structures')
        .select('*')
        .eq('id', structureId)
        .single();
      if (structError) {
        console.warn(`Could not fetch structure with ID ${structureId}: ${structError.message}`);
      } else {
        config.structure = structure;
      }
    }

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_content_model').eq('id', 1).single();
    if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt.");

    let documentContext = '';
    if (direction) {
      const { data: embeddingData, error: embedError } = await supabaseAdmin.functions.invoke('embed-document', { body: { textToEmbed: direction } });
      if (!embedError && !embeddingData.error) {
        const { data: matchedDocs } = await supabaseAdmin.rpc('match_project_documents', {
          p_project_id: config.projectId, p_query_embedding: embeddingData.embedding, p_match_threshold: 0.7, p_match_count: 3
        });
        if (matchedDocs && matchedDocs.length > 0) {
          documentContext = matchedDocs.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n');
        }
      }
    }

    const basePrompt = buildBasePrompt(library.config, documentContext);
    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
    const generationConfig = {
      temperature: library.config.temperature ?? 0.7,
      topP: library.config.topP ?? 0.95,
      maxOutputTokens: library.config.maxTokens ?? 2048,
    };

    const regenerationPromises = articleIdsToRegenerate.map(async (articleId: string) => {
      const originalArticle = existingArticles.find((a: any) => a.id === articleId);
      if (!originalArticle) return null;

      const finalPrompt = buildRegenerationPrompt(basePrompt, config, originalArticle, feedback);
      
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }], generationConfig }),
      });
      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
      
      await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: user.id, prompt: finalPrompt, response: geminiData });
      
      const newContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { ...originalArticle, content: newContent.trim() };
    });

    const regeneratedArticles = (await Promise.all(regenerationPromises)).filter(Boolean);
    const regeneratedIds = new Set(regeneratedArticles.map(a => a.id));

    const newResults = existingArticles.map((article: any) => {
      const regenerated = regeneratedArticles.find(r => r.id === article.id);
      return regenerated || article;
    });

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('content_ai_items')
      .update({ content: JSON.stringify(newResults), updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedItem), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});