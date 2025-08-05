// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const buildPrompt = (config) => {
  return `
    **ROLE:** You are an expert marketing strategist AI. Your task is to create a comprehensive marketing plan based on the user's input.

    **USER INPUT:**
    - **Product/Service Description:** ${config.productDescription || 'Not provided.'}
    - **Target Audience:** ${config.targetAudience || 'Not provided.'}
    - **Campaign Goals:** ${config.goals || 'Not provided.'}
    - **Budget:** ${config.budget || 'Not provided.'}
    - **Timeline:** ${config.timeline || 'Not provided.'}
    - **Key Message:** ${config.keyMessage || 'Not provided.'}
    - **Competitors:** ${config.competitors || 'Not provided.'}

    **TASK:**
    Based on the information above, generate a detailed marketing plan. The plan must be structured as a JSON object.

    **OUTPUT FORMAT (Strictly follow this JSON structure):**
    \`\`\`json
    {
      "executiveSummary": "A brief summary of the entire marketing plan.",
      "swotAnalysis": {
        "strengths": "- Point 1\\n- Point 2",
        "weaknesses": "- Point 1\\n- Point 2",
        "opportunities": "- Point 1\\n- Point 2",
        "threats": "- Point 1\\n- Point 2"
      },
      "targetAudience": "A detailed description of the target audience persona.",
      "marketingChannels": "- Channel 1 (e.g., Social Media - Facebook, TikTok)\\n- Channel 2 (e.g., Google Ads)",
      "contentPillars": "- Pillar 1 (e.g., Educational Content)\\n- Pillar 2 (e.g., Customer Testimonials)",
      "kpis": "- KPI 1 (e.g., Reach)\\n- KPI 2 (e.g., Conversion Rate)"
    }
    \`\`\`

    **INSTRUCTIONS:**
    1.  Analyze the user's input carefully.
    2.  Fill in each section of the JSON object with insightful and actionable marketing strategies.
    3.  The output MUST be only the JSON object inside the markdown code block. Do not include any other text or explanations.
  `;
};

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

    const { data: aiSettings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('google_gemini_api_key, gemini_content_model')
      .eq('id', 1)
      .single();

    if (settingsError || !aiSettings.google_gemini_api_key) {
      throw new Error("Google Gemini API key is not configured in settings.");
    }

    const prompt = buildPrompt(config);
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
    
    const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error("AI did not return a valid JSON plan.");
    }

    let planData;
    try {
      planData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      throw new Error("Failed to parse the AI's JSON response.");
    }

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