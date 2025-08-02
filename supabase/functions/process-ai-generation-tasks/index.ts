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

const buildCommentPrompt = (basePrompt, config) => {
  const ratiosText = (config.ratios || [])
    .map(r => `- Loại: ${r.type || 'Chung'}, Tỉ lệ: ${r.percentage}%, Định hướng: ${r.content}`)
    .join('\n');

  const conditionsText = (config.mandatoryConditions || [])
    .map(c => `- ${c.content}`)
    .join('\n');

  const finalPrompt = `
    ${basePrompt}

    ---
    **THÔNG TIN CHI TIẾT:**

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

    **YÊU CẦU:** Dựa vào TOÀN BỘ thông tin trên, hãy tạo ra chính xác ${config.quantity || 10} bình luận. Mỗi bình luận trên một dòng.
    **CỰC KỲ QUAN TRỌNG:** Mỗi bình luận PHẢI bắt đầu bằng tên loại trong dấu ngoặc vuông, ví dụ: "[Tên Loại] Nội dung bình luận.". Chỉ trả về danh sách các bình luận, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay dòng phân cách nào.
  `;
  return finalPrompt;
};

const buildArticlePrompt = (basePrompt, config) => {
  const conditionsText = (config.mandatoryConditions || [])
    .map(c => `- ${c.content}`)
    .join('\n');

  let structureText = '';
  if (config.structure && config.structure.structure_content) {
    structureText = `
    ---
    **CẤU TRÚC BÀI VIẾT BẮT BUỘC:**
    AI phải tuân thủ TUYỆT ĐỐI cấu trúc sau đây khi viết bài:
    ${config.structure.structure_content}
    ---
    `;
  }

  const finalPrompt = `
    ${basePrompt}

    ---
    **THÔNG TIN CHI TIẾT BÀI VIẾT:**

    **Dạng bài:**
    ${config.format || 'Không có'}

    **Định hướng nội dung chi tiết:**
    ${config.direction || 'Không có'}
    ${structureText}
    ---
    **ĐIỀU KIỆN BẮT BUỘC (QUAN TRỌNG NHẤT):**
    AI phải tuân thủ TUYỆT ĐỐI tất cả các điều kiện sau đây cho MỌI bài viết được tạo ra:
    ${conditionsText || 'Không có điều kiện nào.'}
    ---

    **YÊU CẦU:** Dựa vào TOÀN BỘ thông tin trên, hãy tạo ra chính xác ${config.quantity || 1} bài viết hoàn chỉnh.
    **CỰC KỲ QUAN TRỌNG:** Nếu tạo nhiều hơn 1 bài viết, hãy phân cách mỗi bài viết bằng một dòng duy nhất chứa chính xác: "--- ARTICLE SEPARATOR ---". Chỉ trả về nội dung bài viết, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay tiêu đề không cần thiết nào.
  `;
  return finalPrompt;
};

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data: task, error: taskError } = await supabaseAdmin
      .from('ai_generation_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) {
      return new Response(JSON.stringify({ message: "No pending tasks." }), { status: 200 });
    }

    await supabaseAdmin.from('ai_generation_tasks').update({ status: 'running', progress_step: 'Đang chuẩn bị prompt...' }).eq('id', task.id);

    try {
      const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('type, content').eq('id', task.item_id).single();
      if (itemError) throw itemError;

      const { libraryId, postContent, direction } = task.config;
      if (!libraryId) throw new Error("Config is missing libraryId.");

      const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('*').eq('id', 1).single();
      if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

      const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
      if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
      
      let documentContext = '';
      const contextSource = item.type === 'article' ? direction : postContent;
      if (contextSource) {
        await supabaseAdmin.from('ai_generation_tasks').update({ progress_step: 'Đang tìm tài liệu liên quan...' }).eq('id', task.id);
        const { data: embeddingData, error: embedError } = await supabaseAdmin.functions.invoke('embed-document', { body: { textToEmbed: contextSource } });
        if (embedError || embeddingData.error) {
          console.warn("Could not get embedding for context search:", embedError?.message || embeddingData.error);
        } else {
          const { data: matchedDocs, error: matchError } = await supabaseAdmin.rpc('match_project_documents', {
            p_project_id: task.config.projectId,
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

      const basePrompt = buildBasePrompt(library.config, documentContext);
      
      let finalPrompt;
      if (item.type === 'article') {
        finalPrompt = buildArticlePrompt(basePrompt, task.config);
      } else {
        finalPrompt = buildCommentPrompt(basePrompt, task.config);
      }

      await supabaseAdmin.from('ai_generation_tasks').update({ progress_step: 'Đang gửi yêu cầu đến AI...' }).eq('id', task.id);

      const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] }),
      });

      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
      
      geminiData.model_used = modelToUse;

      await supabaseAdmin.from('ai_generation_tasks').update({ progress_step: 'Đang xử lý và lưu kết quả...' }).eq('id', task.id);

      const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let newContent = [];
      if (item.type === 'article') {
        newContent = rawContent.split('--- ARTICLE SEPARATOR ---')
            .map(content => content.trim())
            .filter(content => content)
            .map(content => ({
                id: crypto.randomUUID(),
                content: content,
                type: task.config.format || 'Bài viết'
            }));
      } else {
        const mandatoryConditions = task.config.mandatoryConditions || [];
        const allConditionIds = mandatoryConditions.map((c) => c.id);
        newContent = rawContent.split('\n')
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
      }

      const existingContent = JSON.parse(item.content || '[]');
      const updatedContent = [...existingContent, ...newContent];

      await supabaseAdmin.from('content_ai_items').update({ content: JSON.stringify(updatedContent) }).eq('id', task.item_id);
      
      await supabaseAdmin.from('ai_generation_tasks').update({ status: 'completed', result: { newContentCount: newContent.length }, progress_step: null }).eq('id', task.id);

      await supabaseAdmin.from('content_ai_logs').insert({ item_id: task.item_id, creator_id: task.creator_id, prompt: finalPrompt, response: geminiData });

    } catch (executionError) {
      await supabaseAdmin.from('ai_generation_tasks').update({ status: 'failed', error_message: executionError.message, progress_step: 'Thất bại' }).eq('id', task.id);
      throw executionError;
    }

    return new Response(JSON.stringify({ message: `Task ${task.id} completed.` }), { status: 200 });

  } catch (error) {
    console.error("Error in task processor:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});