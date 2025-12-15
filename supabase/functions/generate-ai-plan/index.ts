// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_OUTPUT_INSTRUCTION = `
---
### YÊU CẦU ĐẦU RA (CỰC KỲ QUAN TRỌNG)

Bạn PHẢI trả lời bằng một khối mã JSON duy nhất được bao bọc trong \`\`\`json ... \`\`\`.
JSON object phải có cấu trúc chính xác như sau:
\`\`\`json
{
{{json_structure}}
}
\`\`\`
- **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản, lời chào, hay giải thích nào bên ngoài khối mã JSON.
- Hãy điền giá trị cho mỗi trường dựa trên thông tin đã được cung cấp và kiến thức của bạn.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { planId } = await req.json();
    if (!planId) {
      throw new Error("Plan ID is required.");
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
      .select('template_id, config')
      .eq('id', planId)
      .single();
    if (planError) throw planError;

    const config = plan.config || {};

    // Fetch Troll LLM Settings
    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('troll_llm_api_url, troll_llm_api_key, troll_llm_model_id')
      .eq('id', 1)
      .single();

    if (settingsError) {
      throw new Error("Không thể tải cấu hình AI.");
    }

    const { troll_llm_api_url, troll_llm_api_key, troll_llm_model_id } = aiSettings || {};

    if (!troll_llm_api_url || !troll_llm_api_key) {
      throw new Error("Chưa cấu hình API Troll LLM trong trang Cài đặt.");
    }

    const templateId = plan.template_id || 1;
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from('ai_plan_templates')
      .select('structure')
      .eq('id', templateId)
      .single();
    if (templateError || !templateData || !templateData.structure) {
      throw new Error("AI Plan template structure is not configured or is invalid.");
    }
    
    const planStructureRaw = (templateData.structure as any)?.output_fields || templateData.structure as any[];
    const planStructure = planStructureRaw.filter((field: any) => field.is_active !== false);
    const inputStructure = (templateData.structure as any)?.input_fields || [];

    const { data: promptConfigData, error: promptError } = await supabaseAdmin
      .from('ai_plan_prompt_config')
      .select('prompt_structure')
      .eq('id', 1)
      .single();

    if (promptError || !promptConfigData || !promptConfigData.prompt_structure) {
      throw new Error("AI Plan prompt structure is not configured or is invalid.");
    }

    const promptConfig = promptConfigData.prompt_structure;
    const blocks = Array.isArray(promptConfig) ? promptConfig : promptConfig.blocks || [];

    let prompt = blocks
      .map((block: { title: string, content: string }) => `### ${block.title.toUpperCase()}\n\n${block.content}`)
      .join('\n\n---\n\n');

    // Replace {{thong_tin_dau_vao}} placeholder
    if (prompt.includes('{{thong_tin_dau_vao}}')) {
      const inputDescriptions = inputStructure
        .map((field: any) => `*   **${field.label}:** ${config[field.id] || '(không có)'}\n    *   *Mô tả/Hướng dẫn cho AI:* ${field.description || 'Không có.'}`)
        .join('\n');
      prompt = prompt.replace(/{{thong_tin_dau_vao}}/g, inputDescriptions || 'Không có thông tin đầu vào.');
    }

    // Replace {{tai_lieu}} placeholder
    if (prompt.includes('{{tai_lieu}}')) {
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
      prompt = prompt.replace(/{{tai_lieu}}/g, documentContext);
    }

    if (promptConfig.useCoT) {
      let cotPrompt = "Let's think step by step.";
      if (promptConfig.cotFactors && promptConfig.cotFactors.length > 0) {
        const factorsText = promptConfig.cotFactors
          .map((factor: { value: string }) => `- ${factor.value}`)
          .join('\n');
        cotPrompt += "\n\nHere are the key factors to consider in your thinking process:\n" + factorsText;
      }
      prompt += `\n\n${cotPrompt}`;
    }

    const jsonStructureDescription = planStructure.map((field: any) => {
      if (field.display_type === 'content_direction') {
        const subFields = [
          `      "loai_content": "(string) // Loại bài viết"`,
          `      "chu_de": "(string) // Chủ đề"`,
          `      "van_de": "(string) // Vấn đề"`,
          `      "content_demo": "(string) // Content demo"`,
          `      "dinh_huong_comment": "(string) // Định hướng comment"`
        ].join(',\n');
        return `  "${field.id}": [ // Một mảng các đối tượng cho mục '${field.label}'
    {
${subFields}
    },
    ...
  ]`;
      } else if (field.display_type === 'post_scan') {
        const subFields = [
          `      "chu_de_post_can_tim": "(string) // Chủ đề post cần tìm"`,
          `      "dinh_huong_content_comment": "(string) // Định hướng content comment"`,
          `      "demo_comment": "(string) // Demo comment"`
        ].join(',\n');
        return `  "${field.id}": [ // Một mảng các đối tượng cho mục '${field.label}'
    {
${subFields}
    },
    ...
  ]`;
      } else if (field.type === 'dynamic_group') {
        const subFields = (field.sub_fields || []).map((sub: any) => `      - "${sub.id}": "(string) // ${sub.label}`).join('\n');
        return `  "${field.id}": [ // Một mảng các đối tượng
  {
${subFields}
  },
  ...
]`;
      } else {
        return `  "${field.id}": "(string) // ${field.label}"`;
      }
    }).join(',\n');

    const userOutputInstruction = promptConfig.output_instruction || DEFAULT_OUTPUT_INSTRUCTION;
    const outputInstruction = userOutputInstruction.replace('{{json_structure}}', jsonStructureDescription);
    
    const finalPrompt = prompt + outputInstruction;

    let rawContent;
    let responseForLog;

    // --- Troll LLM API Call ---
    let apiUrl = troll_llm_api_url.trim();
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
    if (!apiUrl.endsWith('/chat/completions')) apiUrl += '/chat/completions';

    console.log(`Calling Troll LLM API for AI Plan at ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${troll_llm_api_key}`
      },
      body: JSON.stringify({
        model: troll_llm_model_id || 'gemini-3-pro-preview',
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: promptConfig.temperature ?? 0.7,
        top_p: promptConfig.topP ?? 0.95,
        max_tokens: promptConfig.maxTokens ?? 8192
      })
    });

    const responseText = await apiResponse.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse API response:", responseText);
      throw new Error(`API trả về định dạng không hợp lệ: ${responseText.substring(0, 100)}...`);
    }

    if (!apiResponse.ok) {
      const errorMsg = responseData?.error?.message || responseData?.error || `Lỗi HTTP (${apiResponse.status})`;
      throw new Error(`Troll LLM Error: ${errorMsg}`);
    }

    if (!responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
      throw new Error("API trả về thành công nhưng không tìm thấy nội dung phản hồi.");
    }

    rawContent = responseData.choices[0].message?.content || '';
    responseForLog = responseData;
    console.log("Troll LLM API call successful for AI Plan.");

    let jsonString = '';
    const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = rawContent;
    }

    let planData;
    try {
      planData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON from AI response. Raw content:", rawContent);
      throw new Error("AI đã trả về một định dạng JSON không hợp lệ. Vui lòng thử lại.");
    }

    await supabaseAdmin.from('ai_plan_logs').insert({
      plan_id: planId,
      creator_id: user.id,
      prompt: finalPrompt,
      response: responseForLog
    });

    const { data: updatedPlan, error: updateError } = await supabaseAdmin
      .from('ai_plans')
      .update({ plan_data: planData, updated_at: new Date().toISOString() })
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