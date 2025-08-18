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

const buildRegenerationPrompt = (basePrompt, config, existingComments, feedback) => {
  const ratiosText = (config.ratios || [])
    .map(r => `- Loại: ${r.type || 'Chung'}, Tỉ lệ: ${r.percentage}%, Định hướng: ${r.content}`)
    .join('\n');

  const conditionsText = (config.mandatoryConditions || [])
    .map(c => `- ${c.content}`)
    .join('\n');
  
  const existingCommentsText = existingComments.map((c, i) => `${i + 1}. [${c.type}] ${c.content}`).join('\n');

  const replyQuantity = Number(config.replyQuantity) || 0;
  const totalQuantity = Number(config.quantity) || 10;
  const parentQuantity = totalQuantity - replyQuantity;

  let replyInstruction = '';
  let numberingAndExampleInstruction = '';

  if (replyQuantity > 0) {
      const replyDirectionText = config.replyDirection 
        ? `- **Định hướng cho reply:** ${config.replyDirection}` 
        : '';

      replyInstruction = `
---
**QUY TẮC REPLY (CỰC KỲ QUAN TRỌNG):**
- Trong tổng số ${totalQuantity} bình luận, phải có chính xác **${replyQuantity} bình luận là reply**.
- Các reply PHẢI trả lời các bình luận gốc (từ 1 đến ${parentQuantity}).
- Cú pháp reply BẮT BUỘC: \`[STT reply] reply -> [STT comment gốc]. [Nội dung]\`.
- Ví dụ: \`1 reply -> 5. Đúng rồi đó mom...\`
${replyDirectionText}
- **TUYỆT ĐỐI KHÔNG** sử dụng các định dạng khác như \`(reply)\` hay bất kỳ định dạng nào khác.
---
`;
      numberingAndExampleInstruction = `
**CỰC KỲ QUAN TRỌNG:**
1.  Mỗi bình luận PHẢI bắt đầu bằng tên loại trong dấu ngoặc vuông, ví dụ: "[Tên Loại] Nội dung bình luận.".
2.  **QUY TẮC ĐÁNH SỐ NGƯỜI (CỰC KỲ QUAN TRỌNG):**
    - **Quy tắc Vàng:** Việc đánh số người \`(1)\`, \`(2)\`... **CHỈ** được áp dụng cho những bình luận là một phần của **chuỗi hội thoại**.
    - **Định nghĩa chuỗi hội thoại:** Một chuỗi hội thoại bao gồm một bình luận gốc (không phải là reply) và tất cả các bình luận trả lời nó.
    - **Bình luận đơn lẻ:** Những bình luận không có ai trả lời và cũng không trả lời ai thì **TUYỆT ĐỐI KHÔNG** được đánh số người.
    - **Quy tắc bắt đầu:** Bình luận gốc của **bất kỳ** chuỗi hội thoại nào **LUÔN LUÔN** được đánh số là \`(1)\`.
    - **Quy tắc tiếp diễn:** Các reply trong chuỗi hội thoại đó có thể là của người \`(2)\`, \`(3)\`,... hoặc người \`(1)\` trả lời lại.
    - **Quy tắc reset:** Khi một chuỗi hội thoại kết thúc và một chuỗi hội thoại **mới** bắt đầu (với một bình luận gốc khác), việc đánh số sẽ được **reset** và bắt đầu lại từ \`(1)\`.
- **VÍ DỤ MINH HỌA HOÀN CHỈNH:**
  \`1. [Tương tác] Sữa này tốt thật.\`
  \`2. [Hỏi lại] Sữa này vị ngọt không mom? (1)\`
  \`3. [Tương tác] Ui y chang nhà mình luôn.\`
  \`4. [Tương tác] 2 reply -> 2. Vị thanh mát dễ uống lắm mom ạ. (2)\`
  \`5. [Hỏi lại] Bé nhà mình 7 tháng uống được không? (1)\`
  \`6. [Tương tác] 3 reply -> 2. Cảm ơn mom nhé. (1)\`
  \`7. [Tương tác] 5 reply -> 5. Được đó mom, bé nhà mình cũng 7 tháng. (2)\`
- Chỉ trả về danh sách các bình luận, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay dòng phân cách nào.
`;
  } else {
      numberingAndExampleInstruction = `
**CỰC KỲ QUAN TRỌNG:**
1.  Mỗi bình luận PHẢI bắt đầu bằng tên loại trong dấu ngoặc vuông, ví dụ: "[Tên Loại] Nội dung bình luận".
2.  Tất cả các bình luận phải là các bình luận độc lập, không trả lời nhau.
3.  **TUYỆT ĐỐI KHÔNG** sử dụng cú pháp reply (\`reply ->\`) hoặc đánh số người \`(1)\`, \`(2)\`...
- **VÍ DỤ MINH HỌA:**
  \`[Tương tác] Sữa này tốt thật.\`
  \`[Hỏi lại] Sữa này vị ngọt không mom?\`
  \`[Tương tác] Ui y chang nhà mình luôn.\`
- Chỉ trả về danh sách các bình luận, KHÔNG thêm bất kỳ lời chào, câu giới thiệu, hay dòng phân cách nào.
`;
  }

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
    ${replyInstruction}
    ---
    **ĐIỀU KIỆN BẮT BUỘC (QUAN TRỌNG NHẤT):**
    AI phải tuân thủ TUYỆT ĐỐI tất cả các điều kiện sau đây cho MỌI bình luận được tạo ra:
    ${conditionsText || 'Không có điều kiện nào.'}
    ---

    **YÊU CẦU MỚI:** Dựa vào **FEEDBACK TỪ NGƯỜI DÙNG** và toàn bộ thông tin trên, hãy **VIẾT LẠI TOÀN BỘ** danh sách gồm ${config.quantity || 10} bình luận mới tốt hơn. Mỗi bình luận trên một dòng.
    ${numberingAndExampleInstruction}
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
    const { libraryId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_content_model').eq('id', 1).single();
    if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
    
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
      maxOutputTokens: library.config.maxTokens ?? 8192,
    };

    let geminiData;
    const maxRetries = 3;
    const retryDelay = 1000;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: generationConfig
          }),
      });
      
      geminiData = await geminiRes.json();

      if (!geminiRes.ok) {
        if (geminiRes.status >= 500 && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw new Error(geminiData?.error?.message || `Lỗi API với mã trạng thái ${geminiRes.status}`);
      }

      const hasContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (hasContent) {
        break;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw new Error("AI đã từ chối tạo nội dung, có thể do bộ lọc an toàn.");
      }
    }

    geminiData.model_used = modelToUse;

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const mandatoryConditions = config.mandatoryConditions || [];
    const allConditionIds = mandatoryConditions.map((c) => c.id);

    const newComments = rawContent.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        return { 
          id: crypto.randomUUID(), 
          content: line, 
          type: 'N/A',
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