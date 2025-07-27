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

  let firstRequestUrl = null;
  let firstRawResponse = null;

  try {
    const { postId } = await req.json();
    if (!postId) throw new Error("Post ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: fbSettings, error: settingsError } = await supabaseAdmin.from('apifb_settings').select('url_templates, api_key').eq('id', 1).single();
    if (settingsError || !fbSettings) throw new Error("Facebook API settings are not configured.");
    const { url_templates: urlTemplates, api_key: accessToken } = fbSettings;
    const postApprovalTemplate = urlTemplates?.post_approval;
    if (!postApprovalTemplate) throw new Error("Chưa cấu hình URL cho tính năng Check Duyệt Post trong Cài đặt.");

    const { data: groups, error: groupsError } = await supabaseAdmin.from('seeding_groups').select('id, group_id').eq('post_id', postId);
    if (groupsError) throw new Error(`Failed to fetch groups for post: ${groupsError.message}`);

    const allPosts = [];

    for (const group of groups) {
      const groupId = group.group_id;
      let feedUrl = postApprovalTemplate.replace(/{group-id}/g, groupId);
      if (!feedUrl.includes('access_token=') && accessToken) {
        const separator = feedUrl.includes('?') ? '&' : '?';
        feedUrl += `${separator}access_token=${accessToken}`;
      }
      
      if (!firstRequestUrl) firstRequestUrl = feedUrl;

      try {
        const response = await fetch(feedUrl);
        const responseText = await response.text();
        if (!firstRawResponse) firstRawResponse = responseText;

        if (!response.ok) {
          console.warn(`API error for group ${groupId}: ${responseText}`);
          continue;
        }
        
        const feedData = JSON.parse(responseText);
        if (feedData.data && Array.isArray(feedData.data)) {
            // Add groupId to each post for later processing
            const postsWithGroupId = feedData.data.map(p => ({ ...p, group_id: groupId }));
            allPosts.push(...postsWithGroupId);
        }
      } catch (fetchErr) {
        console.error(`Failed to fetch feed for group ${groupId}:`, fetchErr.message);
      }
    }

    return new Response(JSON.stringify({
      allPosts,
      requestUrl: firstRequestUrl,
      rawResponse: firstRawResponse
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in get-fb-duyetpost function:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      requestUrl: firstRequestUrl,
      rawResponse: firstRawResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})