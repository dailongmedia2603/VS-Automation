// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { planId, config } = await req.json();
    if (!planId || !config) {
      throw new Error("Plan ID and config are required.");
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
      .select('template_id')
      .eq('id', planId)
      .single();
    if (planError) throw planError;

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('google_gemini_api_key, gemini_content_model')
      .eq('id', 1)
      .single();

    if (settingsError || !aiSettings.google_gemini_api_key) {
      throw new Error("Google Gemini API key is not configured in settings.");
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
    const planStructure = templateData.structure as any[];

    const { data: promptConfig, error: promptError } = await supabaseAdmin
      .from('ai_plan_prompt_config')
      .select('prompt_structure')
      .eq('id', 1)
      .single();

    if (promptError || !promptConfig || !promptConfig.prompt_structure || !Array.isArray(promptConfig.prompt_structure)) {
      throw new Error("AI Plan prompt structure is not configured or is invalid.");
    }

    let prompt = (promptConfig.prompt_structure as { title: string, content: string }[])
      .map(block => `### ${block.title.toUpperCase()}\n\n${block.content}`)
      .join('\n\n---\n\n');

    for (const key in config) {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), config[key] || 'Not provided.');
    }

    const jsonStructureDescription = planStructure.map(field => {
      if (field.type === 'dynamic_group') {
        const subFields = (field.sub_fields || []).map((sub: any) => `      - "${sub.id}": (string) // ${sub.label}`).join('\n');
        return `  "${field.id}": [ // An array of objects for ${field.label}
    {
${subFields}
    },
    ...
  ]`;
      } else {
        return `  "${field.id}": (string) // ${field.label}`;
      }
    }).join(',\n');

    const outputInstruction = `
---
### YÊU CẦU ĐẦU RA (CỰC KỲ QUAN TRỌNG)

Bạn PHẢI trả lời bằng một khối mã JSON duy nhất được bao bọc trong \`\`\`json ... \`\`\`.
JSON object phải có cấu trúc chính xác như sau:
\`\`\`json
{
${jsonStructureDescription}
}
\`\`\`
- **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản, lời chào, hoặc giải thích nào bên ngoài khối mã JSON.
- Hãy điền giá trị cho mỗi trường dựa trên thông tin đã được cung cấp và kiến thức của bạn.
`;
    prompt += outputInstruction;

    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      throw new Error(geminiData?.error?.message || 'Failed to call Gemini API.');
    }

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
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
      prompt: prompt,
      response: geminiData
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