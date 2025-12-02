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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { planId, sectionId, feedback } = await req.json();
    if (!planId || !sectionId || !feedback) {
      throw new Error("planId, sectionId, and feedback are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    ).auth.getUser(jwt);
    if (!user) throw new Error("User not authenticated.");

    const { data: plan, error: planError } = await supabaseAdmin
      .from('ai_plans')
      .select('template_id, config, plan_data')
      .eq('id', planId)
      .single();
    if (planError) throw planError;

    const planData = plan.plan_data || {};

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('custom_gemini_api_url, custom_gemini_api_key, gemini_content_model')
      .eq('id', 1)
      .single();
    if (settingsError) {
      throw new Error("Chưa cấu hình AI model.");
    }

    const templateId = plan.template_id || 1;
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from('ai_plan_templates')
      .select('structure')
      .eq('id', templateId)
      .single();
    if (templateError || !templateData || !templateData.structure) {
      throw new Error("AI Plan template structure is not configured.");
    }
    
    const planStructure = (templateData.structure as any)?.output_fields || templateData.structure as any[];
    const inputStructure = (templateData.structure as any)?.input_fields || [];
    const sectionToRegenerate = planStructure.find((s: any) => s.id === sectionId);
    if (!sectionToRegenerate) {
      throw new Error(`Section with ID "${sectionId}" not found in template.`);
    }

    const { data: promptConfigData, error: promptError } = await supabaseAdmin
      .from('ai_plan_prompt_config')
      .select('prompt_structure')
      .eq('id', 1)
      .single();
    if (promptError || !promptConfigData || !promptConfigData.prompt_structure) {
      throw new Error("AI Plan prompt structure is not configured.");
    }

    const promptConfig = promptConfigData.prompt_structure;
    const blocks = Array.isArray(promptConfig) ? promptConfig : promptConfig.blocks || [];

    // Build base prompt from config
    let basePrompt = blocks
      .map((block: { title: string, content: string }) => `### ${block.title.toUpperCase()}\n\n${block.content}`)
      .join('\n\n---\n\n');

    // Replace placeholders
    if (basePrompt.includes('{{thong_tin_dau_vao}}')) {
      const inputDescriptions = inputStructure
        .map((field: any) => `*   **${field.label}:** ${plan.config[field.id] || '(không có)'}\n    *   *Mô tả/Hướng dẫn cho AI:* ${field.description || 'Không có.'}`)
        .join('\n');
      basePrompt = basePrompt.replace(/{{thong_tin_dau_vao}}/g, inputDescriptions || 'Không có thông tin đầu vào.');
    }

    if (basePrompt.includes('{{tai_lieu}}')) {
      let documentContext = '(Không có tài liệu tham khảo)';
      const { data: planDocs, error: docsError } = await supabaseAdmin
          .from('documents')
          .select('title, content')
          .eq('ai_plan_id', planId);

      if (docsError) {
          console.warn(`Could not fetch documents for plan ${planId}:`, docsError.message);
      } else if (planDocs && planDocs.length > 0) {
          documentContext = planDocs.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n');
      }
      basePrompt = basePrompt.replace(/{{tai_lieu}}/g, documentContext);
    }

    // Build regeneration-specific prompt
    const regenerationPrompt = `
${basePrompt}

---

### BỐI CẢNH
Đây là toàn bộ kế hoạch marketing đã được tạo ra trước đó:
\`\`\`json
${JSON.stringify(planData, null, 2)}
\`\`\`

---

### YÊU CẦU CHỈNH SỬA
Người dùng đã cung cấp feedback cho phần "${sectionToRegenerate.label}" (ID: \`${sectionId}\`).

**Feedback của người dùng:**
"${feedback}"

---

### NHIỆM VỤ
Dựa vào **TOÀN BỘ KẾ HOẠCH** và **FEEDBACK CỦA NGƯỜI DÙNG**, hãy tạo lại **CHỈ NỘI DUNG** cho phần "${sectionToRegenerate.label}".
`;

    let jsonStructureDescription;
    if (sectionToRegenerate.display_type === 'content_direction') {
      const subFields = [
        `      "loai_content": "(string) // Loại bài viết"`,
        `      "chu_de": "(string) // Chủ đề"`,
        `      "van_de": "(string) // Vấn đề"`,
        `      "content_demo": "(string) // Content demo"`,
        `      "dinh_huong_comment": "(string) // Định hướng comment"`
      ].join(',\n');
      jsonStructureDescription = `[ // An array of objects
  {
${subFields}
  },
  ...
]`;
    } else if (sectionToRegenerate.display_type === 'post_scan') {
      const subFields = [
        `      "chu_de_post_can_tim": "(string) // Chủ đề post cần tìm"`,
        `      "dinh_huong_content_comment": "(string) // Định hướng content comment"`,
        `      "demo_comment": "(string) // Demo comment"`
      ].join(',\n');
      jsonStructureDescription = `[ // An array of objects
  {
${subFields}
  },
  ...
]`;
    } else if (sectionToRegenerate.type === 'dynamic_group') {
      const subFields = (sectionToRegenerate.sub_fields || []).map((sub: any) => `      - "${sub.id}": "(string) // ${sub.label}`).join('\n');
      jsonStructureDescription = `[ // An array of objects
  {
${subFields}
  },
  ...
]`;
    } else {
      jsonStructureDescription = `(string) // A single string value`;
    }

    const outputInstruction = `
---
### YÊU CẦU ĐẦU RA (CỰC KỲ QUAN TRỌNG)

Bạn PHẢI trả lời bằng một khối mã JSON duy nhất được bao bọc trong \`\`\`json ... \`\`\`.
JSON object phải chứa một key duy nhất là "newContent", với giá trị là nội dung mới được tạo lại.
Cấu trúc của giá trị "newContent" phải như sau:
\`\`\`json
{
  "newContent": ${jsonStructureDescription}
}
\`\`\`
- **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản, lời chào, hay giải thích nào bên ngoài khối mã JSON.
`;

    const finalPrompt = regenerationPrompt + outputInstruction;

    let rawContent;
    let responseForLog;
    let primaryApiError = null;

    try {
      console.log("Attempting to use primary API: Gemini Custom for AI Plan regeneration");
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
      console.log("Primary API call successful for AI Plan regeneration.");

    } catch (customApiError) {
      primaryApiError = customApiError;
      console.warn("Primary API (Gemini Custom) failed for AI Plan regeneration:", customApiError.message);
      console.log("Attempting to use fallback API: Vertex AI for AI Plan regeneration");

      try {
        const credentialsJson = Deno.env.get("GOOGLE_CREDENTIALS_JSON\n\n");
        if (!credentialsJson) {
          throw new Error("Cả API Custom và Vertex AI đều không được cấu hình.");
        }

        const credentials = JSON.parse(credentialsJson);
        const cloudProjectId = credentials.project_id;
        const region = "us-central1";
        const accessToken = await getGcpAccessToken(credentialsJson);
        const modelToUse = aiSettings.gemini_content_model || 'gemini-1.5-pro';
        const generationConfig = {
          temperature: promptConfig.temperature ?? 0.7,
          topP: promptConfig.topP ?? 0.95,
          maxOutputTokens: promptConfig.maxTokens ?? 8192,
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
        if (!vertexRes.ok) {
          throw new Error(vertexData?.error?.message || 'Lỗi gọi API Vertex AI.');
        }

        rawContent = vertexData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        responseForLog = vertexData;
        console.log("Fallback API (Vertex AI) call successful for AI Plan regeneration.");
      } catch (fallbackError) {
        let finalErrorMessage = `Lỗi API dự phòng (Vertex AI): ${fallbackError.message}`;
        if (primaryApiError) {
            finalErrorMessage = `Lỗi API chính (Custom): ${primaryApiError.message}. ${finalErrorMessage}`;
        }
        throw new Error(finalErrorMessage);
      }
    }

    let jsonString = '';
    const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = rawContent;
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from AI response. Raw content:", rawContent);
      throw new Error("AI đã trả về một định dạng JSON không hợp lệ.");
    }

    if (typeof parsedResponse.newContent === 'undefined') {
      throw new Error("Phản hồi của AI không chứa key 'newContent'.");
    }

    const newPlanData = {
      ...planData,
      [sectionId]: parsedResponse.newContent,
    };

    await supabaseAdmin.from('ai_plan_logs').insert({
      plan_id: planId,
      creator_id: user.id,
      prompt: finalPrompt,
      response: responseForLog
    });

    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('ai_plans')
      .update({ plan_data: newPlanData, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedPlan), {
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