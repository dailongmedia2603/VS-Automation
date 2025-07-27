// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeString = (str) => {
  if (!str) return '';
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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { postId } = await req.json();
  if (!postId) {
    return new Response(JSON.stringify({ error: "ID bài viết là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    // 1. Get expected content
    const { data: post, error: postError } = await supabaseAdmin.from('seeding_posts').select('content').eq('id', postId).single();
    if (postError) throw new Error(`Lỗi lấy nội dung bài viết: ${postError.message}`);
    if (!post.content) throw new Error("Bài viết không có nội dung để so sánh.");
    const normalizedPostContent = normalizeString(post.content);

    // 2. Get all groups for this post, including their current status
    const { data: groups, error: groupsError } = await supabaseAdmin.from('seeding_groups').select('id, group_id, status').eq('post_id', postId);
    if (groupsError) throw new Error(`Lỗi lấy danh sách group: ${groupsError.message}`);

    // 3. Get all actual posts from the new table
    const { data: actualPosts, error: actualPostsError } = await supabaseAdmin.from('actual_duyetpost').select('*').eq('post_id', postId);
    if (actualPostsError) throw new Error(`Lỗi lấy bài viết thực tế: ${actualPostsError.message}`);

    // 4. Compare and update
    for (const group of groups) {
      const postsInThisGroup = actualPosts.filter(p => p.group_id === group.group_id);
      const foundPost = postsInThisGroup.find(p => p.message && normalizeString(p.message).includes(normalizedPostContent));

      if (foundPost) {
        await supabaseAdmin.from('seeding_groups').update({
          status: 'approved',
          approved_post_link: foundPost.post_link,
          checked_at: new Date().toISOString()
        }).eq('id', group.id);
      } else {
        // Only update to 'not_found' if it's not already 'approved'
        if (group.status !== 'approved') {
          await supabaseAdmin.from('seeding_groups').update({
            status: 'not_found',
            checked_at: new Date().toISOString()
          }).eq('id', group.id);
        }
      }
    }

    // 5. Check if the entire post is completed
    const { data: allGroupsForPost, error: allGroupsError } = await supabaseAdmin.from('seeding_groups').select('status').eq('post_id', postId);
    if (allGroupsError) throw new Error(`Lỗi kiểm tra lại trạng thái group: ${allGroupsError.message}`);

    const allApproved = allGroupsForPost.every(g => g.status === 'approved');
    if (allApproved && allGroupsForPost.length > 0) {
      await supabaseAdmin.from('seeding_posts').update({ status: 'completed', is_active: false }).eq('id', postId);
    }

    const total = allGroupsForPost.length;
    const currentApprovedCount = allGroupsForPost.filter(g => g.status === 'approved').length;

    return new Response(JSON.stringify({
      approved: currentApprovedCount,
      pending: total - currentApprovedCount,
      total: total
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in compare-and-update-duyetpost function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})