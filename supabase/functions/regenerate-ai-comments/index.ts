// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getGcpAccessToken(credentialsJson: string) {
  const credentials = JSON.parse(credentialsJson);
  const privateKeyPem = credentials.private_key;
  const clientEmail = credentials.client_email;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');

  const binaryDer = atob(pemContents);
  const keyBuffer = new Uint8Array(binaryDer.length).map((_, i) => binaryDer.charCodeAt(i)).buffer;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    },
    privateKey
  );

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${tokenData.error_description || 'Unknown error'}`);
  }

  return tokenData.access_token;
}

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

const buildRegenerationPrompt = (basePrompt, config, existingComments, feedback) => {
  const ratiosText = (config.ratios || [])
    .map(r => `- Loại: ${r.type || 'Chung'}, Tỉ lệ: ${r.percentage}%, Định hướng: ${r.content}`)
    .join('\n');

  const conditionsText = (config.mandatoryConditions || []).map(c => `- ${c.content}`).join('\n');
  
  const existingCommentsText = existingComments.map((c, i) => `${i + 1}. [${c.type}] ${c.content}`).join('\n');

  const replyQuantity = Number(config.replyQuantity) || 0;
  const totalQuantity = Number(config.quantity) || 10;

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
    
    **Số lượng replies cần tạo:** ${replyQuantity} trên tổng số ${totalQuantity} bình luận.
    **Định hướng cho replies (nếu có):** ${config.replyDirection || 'Không có'}
    ---
    **ĐIỀU KIỆN BẮT BUỘC (QUAN TRỌNG NHẤT):**
    AI phải tuân thủ TUYỆT ĐỐI tất cả các điều kiện sau đây cho MỌI bình luận được tạo ra:
    ${conditionsText || 'Không có điều kiện nào.'}
    ---
    **YÊU CẦU ĐẦU RA (CỰC KỲ QUAN TRỌNG):**
    Dựa vào **FEEDBACK TỪ NGƯỜI DÙNG** và toàn bộ thông tin trên, hãy **VIẾT LẠI TOÀN BỘ** danh sách gồm ${totalQuantity} bình luận mới tốt hơn.
    Bạn PHẢI trả lời bằng một khối mã JSON duy nhất được bao bọc trong \`\`\`json ... \`\`\`.
    JSON object phải là một MẢNG (array) chứa các đối tượng (object), mỗi đối tượng đại diện cho một bình luận.
    Mỗi object trong mảng phải có cấu trúc sau:
    - \`stt\`: (number) Số thứ tự của bình luận, bắt đầu từ 1.
    - \`person\`: (number) Số định danh người bình luận (ví dụ: 1, 2, 3...).
    - \`type\`: (string) Loại bình luận dựa trên danh sách tỉ lệ đã cho.
    - \`reply_to\`: (number | null) STT của bình luận gốc mà bình luận này đang trả lời. Nếu là bình luận gốc, giá trị là null.
    - \`content\`: (string) Nội dung chi tiết của bình luận.

    Ví dụ về định dạng JSON:
    \`\`\`json
    [
      {
        "stt": 1,
        "person": 1,
        "type": "Hỏi đáp",
        "reply_to": null,
        "content": "Sản phẩm này có tốt không ạ?"
      },
      {
        "stt": 2,
        "person": 2,
        "type": "Tư vấn",
        "reply_to": 1,
        "content": "Chào bạn, sản phẩm này rất tốt và được nhiều người tin dùng ạ."
      }
    ]
    \`\`\`
    - **QUY TẮC REPLY:** Nếu một bình luận là reply, trường "reply_to" phải chứa "stt" của bình luận gốc. Nếu không phải reply, "reply_to" phải là null.
    - **QUY TẮC ĐÁNH SỐ NGƯỜI:**
        - Một chuỗi hội thoại (một bình luận gốc và các trả lời của nó) nên được giới hạn trong một số lượng nhỏ người tham gia (thường là 2-3 người) để giữ tính tự nhiên.
        - Bình luận gốc của một chuỗi hội thoại **LUÔN LUÔN** là \`person: 1\`.
        - Người trả lời đầu tiên thường là \`person: 2\`.
        - Các bình luận tiếp theo trong cùng chuỗi hội thoại nên luân phiên giữa \`person: 1\` và \`person: 2\`. Chỉ giới thiệu \`person: 3\` nếu thực sự cần thiết cho ngữ cảnh.
        - Khi một chuỗi hội thoại mới bắt đầu (một bình luận gốc mới), việc đánh số người sẽ được **reset** và bắt đầu lại từ \`person: 1\`.
    - **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản, lời chào, hay giải thích nào bên ngoài khối mã JSON.
  `;
  return finalPrompt;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { itemId, feedback } = await req.json();
  if (!itemId || !feedback) {
    return new Response(JSON.stringify({ error: "Thiếu thông tin cần thiết (itemId, feedback)." }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(jwt);
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated.");

    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('config, content').eq('id', itemId).single();
    if (itemError) throw itemError;
    if (!item) throw new Error("Không tìm thấy mục tương ứng.");

    const existingComments = JSON.parse(item.content || '[]');
    const { config } = item;
    const { libraryId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('custom_gemini_api_url, custom_gemini_api_key, gemini_content_model')
      .eq('id', 1)
      .single();

    if (settingsError) {
      throw new Error("Chưa cấu hình AI trong trang Cài đặt.");
    }

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

    let rawContent;
    let responseForLog;
    let primaryApiError = null;

    try {
      console.log("Attempting to use primary API: Gemini Custom for comment regeneration");
      if (!aiSettings.custom_gemini_api_url || !aiSettings.custom_gemini_api_key) {
        throw new Error("API Gemini Custom chưa được cấu hình.");
      }
      const { custom_gemini_api_url: apiUrl, custom_gemini_api_key: token } = aiSettings;
      
      const url = new URL(apiUrl);
      url.searchParams.append('token', token);

      const formData = new FormData();
      formData.append('prompt', finalPrompt);

      const apiResponse = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: formData,
      });

      const responseText = await apiResponse.text();
      if (!apiResponse.ok) throw new Error(`Lỗi API Gemini Custom: ${responseText}`);
      
      const responseData = JSON.parse(responseText);
      if (!responseData.success || typeof responseData.answer === 'undefined') {
        throw new Error(`API trả về lỗi hoặc định dạng không mong đợi: ${responseData.message || responseText}`);
      }

      rawContent = responseData.answer;
      responseForLog = responseData;
      console.log("Primary API call successful for comment regeneration.");

    } catch (customApiError) {
      primaryApiError = customApiError;
      console.warn("Primary API (Gemini Custom) failed for comment regeneration:", customApiError.message);
      console.log("Attempting to use fallback API: Vertex AI for comment regeneration");

      try {
        const credentialsJson = Deno.env.get("GOOGLE_CREDENTIALS_JSON\n\n");
        if (!credentialsJson) throw new Error("Cả API Custom và Vertex AI đều không được cấu hình.");

        const credentials = JSON.parse(credentialsJson);
        const cloudProjectId = credentials.project_id;
        const region = "us-central1";
        const accessToken = await getGcpAccessToken(credentialsJson);
        const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
        const generationConfig = {
          temperature: library.config.temperature ?? 0.7,
          topP: library.config.topP ?? 0.95,
          maxOutputTokens: library.config.maxTokens ?? 8192,
        };

        const vertexAiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${cloudProjectId}/locations/${region}/publishers/google/models/${modelToUse}:generateContent`;

        const vertexRes = await fetch(vertexAiUrl, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
            generationConfig: generationConfig
          }),
        });

        const vertexData = await vertexRes.json();
        if (!vertexRes.ok) throw new Error(vertexData?.error?.message || 'Lỗi gọi API Vertex AI.');

        rawContent = vertexData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        responseForLog = vertexData;
        console.log("Fallback API (Vertex AI) call successful for comment regeneration.");
      } catch (fallbackError) {
        let finalErrorMessage = `Lỗi API dự phòng (Vertex AI): ${fallbackError.message}`;
        if (primaryApiError) {
            finalErrorMessage = `Lỗi API chính (Custom): ${primaryApiError.message}. ${finalErrorMessage}`;
        }
        throw new Error(finalErrorMessage);
      }
    }

    const mandatoryConditions = config.mandatoryConditions || [];
    const allConditionIds = mandatoryConditions.map((c) => c.id);

    let jsonString = '';
    const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = rawContent;
    }
    
    let newComments;
    try {
      const parsedComments = JSON.parse(jsonString);
      newComments = parsedComments.map((comment: any) => ({
        id: crypto.randomUUID(),
        ...comment,
        metConditionIds: allConditionIds
      }));
    } catch (e) {
      console.error("Failed to parse JSON from AI comment response. Raw content:", rawContent);
      throw new Error("AI đã trả về một định dạng JSON không hợp lệ cho bình luận.");
    }

    await supabaseAdmin
      .from('content_ai_items')
      .update({ 
        content: JSON.stringify(newComments), 
        updated_at: new Date().toISOString(),
        generation_status: 'idle',
        generation_error: null
      })
      .eq('id', itemId);
    
    await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: user.id, prompt: finalPrompt, response: responseForLog });

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    console.error("Error in regeneration function:", error.message, error.stack);
    await supabaseAdmin
      .from('content_ai_items')
      .update({
        generation_status: 'failed',
        generation_error: error.message
      })
      .eq('id', itemId);
      
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });
  }
});