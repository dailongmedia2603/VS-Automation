// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatList = (items) => (items && items.length > 0 ? items.map(p => `- ${p.value}`).join('\n') : '(Chưa có thông tin)');
const formatNumberedList = (items) => (items && items.length > 0 ? items.map((s, i) => `${i + 1}. ${s.value}`).join('\n') : '(Chưa có quy trình)');

const buildBasePrompt = (libraryConfig, documentContext) => {
  const config = libraryConfig || {};
  const dataMap = {
    '{{industry}}': config.industry || '(Chưa cung cấp)',
    '{{role}}': config.role || '(Chưa cung cấp)',
    '{{style}}': config.style || '(Chưa cung cấp)',
    '{{tone}}': config.tone || '(Chưa cung cấp)',
    '{{language}}': config.language || '(Chưa cung cấp)',
    '{{goal}}': config.goal || '(Chưa cung cấp)',
    '{{processSteps}}': formatNumberedList(config.processSteps),
    '{{conversation_history}}': '(Lịch sử trò chuyện không áp dụng cho tác vụ này)',
    '{{document_context}}': documentContext || '(Không có tài liệu tham khảo liên quan)',
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
    **CỰC KỲ QUAN TRỌNG:** Mỗi bình luận PHẢI bắt đầu bằng tên loại trong dấu ngoặc vuông, ví dụ: "[Tên Loại] Nội dung bình luận.". Chỉ trả về danh sách các bình luận, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay dòng phân cách nào.
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

    // Get user from Authorization header to find the creator_id
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(jwt);
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated.");

    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('config').eq('id', itemId).single();
    if (itemError) throw itemError;
    if (!item) throw new Error("Không tìm thấy mục tương ứng.");

    const { config } = item;
    const { libraryId, postContent } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_content_model').eq('id', 1).single();
    if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
    
    // --- Start: Document Context Retrieval ---
    let documentContext = '';
    if (postContent) {
      const { data: embeddingData, error: embedError } = await supabaseAdmin.functions.invoke('embed-document', { body: { textToEmbed: postContent } });
      if (embedError || embeddingData.error) {
        console.warn("Could not get embedding for context search:", embedError?.message || embeddingData.error);
      } else {
        const { data: matchedDocs, error: matchError } = await supabaseAdmin.rpc('match_project_documents', {
          p_project_id: config.projectId,
          p_query_embedding: embeddingData.embedding,
          p_match_threshold: 0.7,
          p_match_count: 3
        });
        if (matchError) {
          console.warn("Could not match documents:", matchError.message);
        } else if (matchedDocs && matchedDocs.length > 0) {
          documentContext = matchedDocs.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n');
        }
      }
    }
    // --- End: Document Context Retrieval ---

    const basePrompt = buildBasePrompt(library.config, documentContext);
    let finalPrompt = buildRegenerationPrompt(basePrompt, config, existingComments, feedback);

    if (library.config.useCoT) {
      let cotPrompt = "Let's think step by step.";
      if (library.config.cotFactors && library.config.cotFactors.length > 0) {
        const factorsText = library.config.cotFactors
          .map((factor: { value: string }) => `- ${factor.value}`)
          .join('\n');
        cotPrompt += "\n\nHere are the key factors to consider in your thinking process:\n" + factorsText;
      }
      finalPrompt += `\n\n${cotPrompt}`;
    }

    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
    
    const generationConfig = {
      temperature: library.config.temperature ?? 0.7,
      topP: library.config.topP ?? 0.95,
      maxOutputTokens: library.config.maxTokens ?? 2048,
    };

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: generationConfig
        }),
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
    
    geminiData.model_used = modelToUse;

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const mandatoryConditions = config.mandatoryConditions || [];
    const allConditionIds = mandatoryConditions.map((c) => c.id);

    const newComments = rawContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('[') && line.includes(']'))
      .map(line => {
        const match = line.match(/^\[(.*?)\]\s*(.*)$/);
        const type = match ? match[1] : 'Chưa phân loại';
        const content = match ? match[2] : line;
        
        return { 
          id: crypto.randomUUID(), 
          content: content, 
          type: type,
          metConditionIds: allConditionIds
        };
      });

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('content_ai_items')
      .update({ content: JSON.stringify(newComments), updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: user.id, prompt: finalPrompt, response: geminiData });

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