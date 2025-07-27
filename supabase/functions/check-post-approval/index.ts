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

    // Step 1: Get settings and groups to check
    const { data: fbSettings, error: settingsError } = await supabaseAdmin.from('apifb_settings').select('url_templates, api_key').eq('id', 1).single();
    if (settingsError || !fbSettings) throw new Error("Facebook API settings are not configured.");
    const { url_templates: urlTemplates, api_key: accessToken } = fbSettings;
    const postApprovalTemplate = urlTemplates?.post_approval;
    if (!postApprovalTemplate) throw new Error("Chưa cấu hình URL cho tính năng Check Duyệt Post trong Cài đặt.");

    const { data: groups, error: groupsError } = await supabaseAdmin.from('seeding_groups').select('id, group_id').eq('post_id', postId);
    if (groupsError) throw new Error(`Failed to fetch groups for post: ${groupsError.message}`);

    // Step 2: Fetch data for each group and process it
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

        // Invoke the processing function
        const { error: processError } = await supabaseAdmin.functions.invoke('process-and-store-duyetpost', {
          body: { rawResponse: responseText, internalPostId: postId, groupId: groupId }
        });
        if (processError) throw new Error(`Lỗi xử lý dữ liệu cho group ${groupId}: ${processError.message}`);

      } catch (fetchErr) {
        console.error(`Failed to fetch or process feed for group ${groupId}:`, fetchErr.message);
      }
    }

    // Step 3: Invoke the comparison function
    const { data: compareResult, error: compareError } = await supabaseAdmin.functions.invoke('compare-and-update-duyetpost', {
      body: { postId: postId }
    });
    if (compareError) throw new Error(`Lỗi so sánh dữ liệu: ${compareError.message}`);

    return new Response(JSON.stringify({
      ...compareResult,
      requestUrl: firstRequestUrl,
      rawResponse: firstRawResponse
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in check-post-approval orchestrator:', error.message);
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