// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeString = (str) => {
  if (!str) return '';
  return str.normalize('NFC').toLowerCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId, timeCheckString } = await req.json();
    if (!projectId) throw new Error("Project ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: project, error: projectError } = await supabaseAdmin
      .from('post_scan_projects')
      .select('keywords, group_ids, is_ai_check_active, post_scan_ai_prompt')
      .eq('id', projectId)
      .single();
    if (projectError) throw projectError;

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('google_gemini_api_key').eq('id', 1).single();
    if (settingsError) throw new Error("Chưa cấu hình AI.");

    const keywords = (project.keywords || '').split('\n').map(k => normalizeString(k.trim())).filter(Boolean);
    const groupIds = (project.group_ids || '').split('\n').map(id => id.trim()).filter(Boolean);
    if (keywords.length === 0 || groupIds.length === 0) {
      throw new Error("Vui lòng cấu hình từ khóa và ID group.");
    }

    const { data: fbSettings, error: fbSettingsError } = await supabaseAdmin.from('apifb_settings').select('url_templates, api_key').eq('id', 1).single();
    if (fbSettingsError || !fbSettings) throw new Error("Chưa cấu hình API Facebook.");
    const { url_templates: urlTemplates, api_key: accessToken } = fbSettings;
    const postApprovalTemplate = urlTemplates?.post_approval;
    if (!postApprovalTemplate) throw new Error("Chưa cấu hình URL cho Check Duyệt Post.");

    const allMatchedPosts = [];
    const allRequestUrls = [];

    for (const groupId of groupIds) {
      let feedUrl = postApprovalTemplate.replace(/{group-id}/g, groupId).replace('{time_check}', timeCheckString || '');
      if (!feedUrl.includes('access_token=') && accessToken) {
        feedUrl += (feedUrl.includes('?') ? '&' : '?') + `access_token=${accessToken}`;
      }
      allRequestUrls.push(feedUrl);

      const response = await fetch(feedUrl);
      const responseText = await response.text();
      if (!response.ok) continue;
      
      const feedData = JSON.parse(responseText);
      const postsArray = (feedData.data && feedData.data.data && Array.isArray(feedData.data.data)) ? feedData.data.data : (feedData.data && Array.isArray(feedData.data)) ? feedData.data : [];

      for (const post of postsArray) {
        const normalizedContent = normalizeString(post.message);
        const foundKeywords = keywords.filter(kw => normalizedContent.includes(kw));
        if (foundKeywords.length > 0) {
          let aiResult = null;
          if (project.is_ai_check_active && aiSettings.google_gemini_api_key && project.post_scan_ai_prompt) {
            const geminiPrompt = `${project.post_scan_ai_prompt}\n\nNội dung bài viết:\n${post.message}`;
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${aiSettings.google_gemini_api_key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }] }] }),
            });
            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              aiResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text.trim() || 'Không';
            }
          }

          allMatchedPosts.push({
            project_id: projectId,
            post_content: post.message,
            post_link: post.permalink_url,
            post_author_name: post.from?.name,
            post_author_id: post.from?.id,
            group_id: groupId,
            found_keywords: foundKeywords,
            ai_check_result: aiResult,
          });
        }
      }
    }

    await supabaseAdmin.from('log_post_scan').upsert({ project_id: projectId, request_urls: allRequestUrls, created_at: new Date().toISOString() });
    if (allMatchedPosts.length > 0) {
      await supabaseAdmin.from('post_scan_results').insert(allMatchedPosts);
    }
    await supabaseAdmin.from('post_scan_projects').update({ last_scanned_at: new Date().toISOString() }).eq('id', projectId);

    const { data: allProjectResults } = await supabaseAdmin.from('post_scan_results').select('*').eq('project_id', projectId).order('scanned_at', { ascending: false });
    return new Response(JSON.stringify(allProjectResults || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})