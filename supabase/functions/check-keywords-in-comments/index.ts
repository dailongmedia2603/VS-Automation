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
    // 1. Get post link
    const { data: post, error: postError } = await supabaseAdmin
      .from('keyword_check_posts')
      .select('link')
      .eq('id', postId)
      .single();
    if (postError || !post || !post.link) throw new Error("Không tìm thấy bài viết hoặc bài viết thiếu link.");

    // 2. Get keywords to check
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keyword_check_items')
      .select('*')
      .eq('post_id', postId);
    if (keywordsError) throw new Error("Lỗi lấy danh sách từ khóa.");

    // 3. Get comments from Facebook
    const { data: fbData, error: fbError } = await supabaseAdmin.functions.invoke('get-fb-comments', {
      body: { fbPostId: post.link }
    });
    if (fbError || fbData.error) throw new Error(fbError?.message || fbData?.error);
    
    const rawComments = JSON.parse(fbData.rawResponse);
    const comments = rawComments?.data?.data || rawComments?.data || [];

    // 4. Compare and prepare updates
    const updates = [];
    let foundCount = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeString(keyword.content);
      const foundComment = comments.find(c => c.message && normalizeString(c.message).includes(normalizedKeyword));

      if (foundComment) {
        foundCount++;
        updates.push({
          id: keyword.id,
          status: 'found',
          found_by_account_name: foundComment.from?.name,
          found_by_account_id: foundComment.from?.id,
          found_comment_link: foundComment.permalink_url,
          found_at: foundComment.created_time,
        });
      } else {
        updates.push({
          id: keyword.id,
          status: 'not_found',
          found_by_account_name: null,
          found_by_account_id: null,
          found_comment_link: null,
          found_at: null,
        });
      }
    }

    // 5. Batch update
    if (updates.length > 0) {
      const updatePromises = updates.map(updateData => {
        const { id, ...dataToUpdate } = updateData;
        return supabaseAdmin.from('keyword_check_items').update(dataToUpdate).eq('id', id);
      });
      await Promise.all(updatePromises);
    }
    
    // 6. Update post status
    const allFound = foundCount === keywords.length;
    await supabaseAdmin.from('keyword_check_posts').update({ status: allFound ? 'completed' : 'pending' }).eq('id', postId);

    const result = { found: foundCount, notFound: keywords.length - foundCount, total: keywords.length };
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in check-keywords-in-comments function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})