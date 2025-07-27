// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeString = (str) => {
  if (!str) return '';
  // Remove URLs, multiple spaces, and convert to lowercase for better matching
  return str
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { postId } = await req.json();
    if (!postId) throw new Error("Post ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: post, error: postError } = await supabaseAdmin.from('seeding_posts').select('content').eq('id', postId).single();
    if (postError) throw new Error(`Failed to fetch post content: ${postError.message}`);
    if (!post.content) throw new Error("Post has no content to check.");

    const { data: fbSettings, error: settingsError } = await supabaseAdmin.from('apifb_settings').select('api_url, api_key').eq('id', 1).single();
    if (settingsError || !fbSettings || !fbSettings.api_url || !fbSettings.api_key) {
      throw new Error("Facebook API settings are not configured.");
    }

    const { api_url: apiUrl, api_key: accessToken } = fbSettings;
    const normalizedPostContent = normalizeString(post.content);

    const { data: groups, error: groupsError } = await supabaseAdmin.from('seeding_groups').select('id, group_id').eq('post_id', postId);
    if (groupsError) throw new Error(`Failed to fetch groups for post: ${groupsError.message}`);

    for (const group of groups) {
      const groupId = group.group_id;
      const feedUrl = `${apiUrl}/${groupId}/feed?fields=message,permalink_url&limit=100&access_token=${accessToken}`;
      
      try {
        const response = await fetch(feedUrl);
        const feedData = await response.json();

        if (!response.ok) {
            console.warn(`API error for group ${groupId}: ${feedData?.error?.message || 'Unknown error'}`);
            continue; // Skip to next group on API error
        }

        if (feedData.data) {
          const foundPost = feedData.data.find(p => p.message && normalizeString(p.message).includes(normalizedPostContent));
          
          if (foundPost) {
            await supabaseAdmin.from('seeding_groups').update({
              status: 'approved',
              approved_post_link: foundPost.permalink_url,
              checked_at: new Date().toISOString()
            }).eq('id', group.id);
          } else {
            await supabaseAdmin.from('seeding_groups').update({
              checked_at: new Date().toISOString()
            }).eq('id', group.id);
          }
        }
      } catch (fetchErr) {
          console.error(`Failed to fetch feed for group ${groupId}:`, fetchErr.message);
      }
    }

    const { data: allGroupsForPost, error: allGroupsError } = await supabaseAdmin.from('seeding_groups').select('status').eq('post_id', postId);
    if (allGroupsError) throw new Error(`Failed to re-fetch group statuses: ${allGroupsError.message}`);

    const allApproved = allGroupsForPost.every(g => g.status === 'approved');
    if (allApproved && allGroupsForPost.length > 0) {
      await supabaseAdmin.from('seeding_posts').update({ status: 'completed' }).eq('id', postId);
    }

    const total = allGroupsForPost.length;
    const currentApprovedCount = allGroupsForPost.filter(g => g.status === 'approved').length;
    
    return new Response(JSON.stringify({
      approved: currentApprovedCount,
      pending: total - currentApprovedCount,
      total: total
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in check-post-approval function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})