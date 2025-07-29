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
    const { projectId, posts } = await req.json();
    if (!projectId) throw new Error("Project ID is required.");
    if (!posts || !Array.isArray(posts)) throw new Error("Posts array is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: project, error: projectError } = await supabaseAdmin
      .from('post_scan_projects')
      .select('post_scan_ai_prompt')
      .eq('id', projectId)
      .single();
    if (projectError) throw projectError;

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key, gemini_scan_model').eq('id', 1).single();
    if (settingsError) throw new Error("Chưa cấu hình AI.");

    if (!aiSettings.google_gemini_api_key || !project.post_scan_ai_prompt) {
      // If AI is not configured, just return the posts as they are.
      return new Response(JSON.stringify({ posts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const postsWithAiResults = [];
    for (const post of posts) {
      const geminiPrompt = `${project.post_scan_ai_prompt}\n\nNội dung bài viết:\n${post.post_content}`;
      const modelToUse = aiSettings.gemini_scan_model || 'gemini-pro';
      let geminiData = null;
      let aiResult = null;
      let aiDetails = null;

      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] }),
        });
        
        geminiData = await geminiRes.json();

        if (geminiRes.ok) {
          aiResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text.trim() || 'Không';
        } else {
          aiResult = `Lỗi: ${geminiData?.error?.message || 'Không rõ'}`;
        }
      } catch (e) {
        aiResult = `Lỗi: ${e.message}`;
        geminiData = { error: e.message };
      }
      
      aiDetails = { prompt: geminiPrompt, response: geminiData };

      postsWithAiResults.push({
        ...post,
        ai_check_result: aiResult,
        ai_check_details: aiDetails,
      });
    }

    return new Response(JSON.stringify({ posts: postsWithAiResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})