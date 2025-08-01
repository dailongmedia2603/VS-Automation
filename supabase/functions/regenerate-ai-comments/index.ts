// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatList = (items) => (items && items.length > 0 ? items.map(p => `- ${p.value}`).join('\n') : '(Chưa có thông tin)');
const formatNumberedList = (items) => (items && items.length > 0 ? items.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : '(Chưa có quy trình)');

const buildBasePrompt = (libraryConfig) => {
  const config = libraryConfig || {};
  const dataMap = {
    '{{industry}}': config.industry || '(Chưa cung cấp)',
    '{{role}}': config.role || '(Chưa cung cấp)',
    '{{products}}': formatList(config.products),
    '{{style}}': config.style || '(Chưa cung cấp)',
    '{{tone}}': config.tone || '(Chưa cung cấp)',
    '{{language}}': config.language || '(Chưa cung cấp)',
    '{{pronouns}}': config.pronouns || '(Chưa cung cấp)',
    '{{customerPronouns}}': config.customerPronouns || '(Chưa cung cấp)',
    '{{goal}}': config.goal || '(Chưa cung cấp)',
    '{{processSteps}}': formatNumberedList(config.processSteps),
    '{{conditions}}': formatList(config.conditions),
    '{{conversation_history}}': '(Lịch sử trò chuyện không áp dụng cho tác vụ này)',
    '{{document_context}}': '(Tài liệu nội bộ không áp dụng cho tác vụ này)',
  };

  const promptTemplate = libraryConfig.promptTemplate || [];
  
  return promptTemplate.map(block => {
    let content = block.content;
    for (const [key, value] of Object.entries(dataMap)) {
      content = content.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }
    return `### ${block.title.toUpperCase()}\n\n${content}`;
  }).join('\n\n---\n\n');
};

const buildRegenerationPrompt = (basePrompt, config, existingComments, feedback) => {
  const ratiosText = (config.ratios || [])
    .map(r => `- Loại: ${r.type || 'Chung'}, Tỉ lệ: ${r.percentage}%, Định hướng: ${r.content}`)
    .join('\n');

  const conditionsText = (config.mandatoryConditions || [])
    .map(c => `- ${c.content}`)
    .join('\n');
  
  const existingCommentsText = existingComments.map((c, i) => `${i + 1}. [${c.type}] ${c.content}`).join('\n');

  const finalPrompt = `
    ${basePrompt}

    ---
    **BÌNH LUẬN HIỆN TẠI:**
    Đây là danh sách các bình luận đã được tạo ra trước đó:
    ${existingCommentsText || 'Không có bình luận nào.'}
    ---
    **YÊU CẦU CHỈNH SỬA (FEEDBACK TỪ NGƯỜI DÙNG):**
    "${feedback}"
    ---
    **THÔNG TIN CHI TIẾT (GIỮ NGUYÊN):**

    **Nội dung bài viết để bình luận:**
    ${config.postContent || 'Không có'}

    **Định hướng chung cho bình luận:**
    ${config.commentDirection || 'Không có'}

    **Tỉ lệ và loại bình luận cần tạo:**
    ${ratiosText || 'Không có'}
    ---
    **ĐIỀU KIỆN BẮT BUỘC (QUAN TRỌNG NHẤT):**
    AI phải tuân thủ TUYỆT ĐỐI tất cả các điều kiện sau đây cho MỌI bình luận được tạo ra:
    ${conditionsText || 'Không có điều kiện nào.'}
    ---

    **YÊU CẦU MỚI:** Dựa vào **FEEDBACK TỪ NGƯỜI DÙNG** và toàn bộ thông tin trên, hãy **VIẾT LẠI TOÀN BỘ** danh sách gồm ${config.quantity || 10} bình luận mới tốt hơn. Mỗi bình luận trên một dòng.
    **QUAN TRỌNG:** Mỗi bình luận PHẢI bắt đầu bằng tên loại trong dấu ngoặc vuông, ví dụ: "[Tên Loại] Nội dung bình luận."
  `;
  return finalPrompt;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { itemId, feedback, existingComments } = await req.json();
    if (!itemId || !feedback || !existingComments) {
      throw new Error("Thiếu thông tin cần thiết (itemId, feedback, existingComments).");
    }

    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('config, creator_id').eq('id', itemId).single();
    if (itemError) throw itemError;
    if (!item) throw new Error("Không tìm thấy mục tương ứng.");

    const { config, creator_id } = item;
    const { libraryId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_content_model').eq('id', 1).single();
    if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
    
    const basePrompt = buildBasePrompt(library.config);
    const finalPrompt = buildRegenerationPrompt(basePrompt, config, existingComments, feedback);

    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] }),
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
    
    geminiData.model_used = modelToUse;

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const mandatoryConditions = config.mandatoryConditions || [];
    const allConditionIds = mandatoryConditions.map((c) => c.id);

    const newComments = rawContent.split('\n').map(line => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(/^\[(.*?)\]\s*(.*)$/);
      const type = match ? match[1] : 'Chưa phân loại';
      const content = match ? match[2] : trimmedLine;
      
      return { 
        id: crypto.randomUUID(), 
        content: content, 
        type: type,
        metConditionIds: allConditionIds
      };
    }).filter(c => c.content);

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('content_ai_items')
      .update({ content: JSON.stringify(newComments), updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: creator_id, prompt: finalPrompt, response: geminiData });

    return new Response(JSON.stringify(updatedItem), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    console.error("Error in regeneration function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});