// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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

const buildFinalPrompt = (basePrompt, config) => {
  const ratiosText = (config.ratios || [])
    .map(r => `- ${r.percentage}%: ${r.content}`)
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

    **YÊU CẦU:** Dựa vào TOÀN BỘ thông tin trên, hãy tạo ra chính xác ${config.quantity || 10} bình luận. Mỗi bình luận trên một dòng, không có đánh số hay gạch đầu dòng.
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

    await supabaseAdmin.from('ai_generation_tasks').update({ status: 'running' }).eq('id', task.id);

    try {
      const { libraryId } = task.config;
      if (!libraryId) throw new Error("Config is missing libraryId.");

      const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_content_model').eq('id', 1).single();
      if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

      const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
      if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
      
      const basePrompt = buildBasePrompt(library.config);
      const finalPrompt = buildFinalPrompt(basePrompt, task.config);

      const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] }),
      });

      const geminiData = await geminiRes.json();
      if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');

      const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const newComments = rawContent.split('\n').map(c => ({ 
        id: crypto.randomUUID(), 
        content: c.trim(), 
        status: 'Đạt',
        conditionsStatus: 'Đạt'
      })).filter(c => c.content);

      const { data: currentItem, error: itemError } = await supabaseAdmin.from('content_ai_items').select('content').eq('id', task.item_id).single();
      if (itemError) throw itemError;

      const existingComments = JSON.parse(currentItem.content || '[]');
      const updatedComments = [...existingComments, ...newComments];

      await supabaseAdmin.from('content_ai_items').update({ content: JSON.stringify(updatedComments) }).eq('id', task.item_id);
      
      await supabaseAdmin.from('ai_generation_tasks').update({ status: 'completed', result: { newCommentsCount: newComments.length } }).eq('id', task.id);

      await supabaseAdmin.from('content_ai_logs').insert({ item_id: task.item_id, creator_id: task.creator_id, prompt: finalPrompt, response: geminiData });

    } catch (executionError) {
      await supabaseAdmin.from('ai_generation_tasks').update({ status: 'failed', error_message: executionError.message }).eq('id', task.id);
      throw executionError;
    }

    return new Response(JSON.stringify({ message: `Task ${task.id} completed.` }), { status: 200 });

  } catch (error) {
    console.error("Error in task processor:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});