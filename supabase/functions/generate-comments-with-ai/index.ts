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

  const promptTemplate = config.promptTemplate || [];
  
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

    **YÊU CẦU:** Dựa vào TOÀN BỘ thông tin trên, hãy tạo ra chính xác ${config.quantity || 10} bình luận. Mỗi bình luận trên một dòng, không có đánh số hay gạch đầu dòng.
  `;
  return finalPrompt;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { libraryId, config } = await req.json();
    if (!libraryId || !config) {
      throw new Error("Thiếu ID thư viện prompt hoặc cấu hình.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
        .from('ai_settings')
        .select('google_gemini_api_key, gemini_content_model')
        .eq('id', 1)
        .single();
    if (settingsError || !aiSettings.google_gemini_api_key) {
        throw new Error("Chưa cấu hình API Google Gemini trong Cài đặt.");
    }

    const { data: library, error: libraryError } = await supabaseAdmin
        .from('prompt_libraries')
        .select('config')
        .eq('id', libraryId)
        .single();
    if (libraryError || !library.config) {
        throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
    }
    
    const basePrompt = buildBasePrompt(library.config);
    const finalPrompt = buildFinalPrompt(basePrompt, config);

    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] }),
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
        throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
    }

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const comments = rawContent.split('\n').map(c => c.trim()).filter(Boolean);

    return new Response(JSON.stringify({ comments, log: { prompt: finalPrompt, response: geminiData } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})