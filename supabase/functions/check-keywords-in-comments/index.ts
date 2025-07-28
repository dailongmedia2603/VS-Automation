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
    // 1. Get post content (stored in 'link' field)
    const { data: post, error: postError } = await supabaseAdmin
      .from('keyword_check_posts')
      .select('link') // 'link' now contains the content to check
      .eq('id', postId)
      .single();
    if (postError || !post || !post.link) throw new Error("Không tìm thấy post hoặc post không có nội dung.");

    const contentToCheck = post.link;
    const normalizedContent = normalizeString(contentToCheck);

    // 2. Get keywords to check
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keyword_check_items')
      .select('*')
      .eq('post_id', postId);
    if (keywordsError) throw new Error("Lỗi lấy danh sách từ khóa.");

    // 3. Compare and prepare updates
    const updates = [];
    let foundCount = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = normalizeString(keyword.content);
      
      if (normalizedContent.includes(normalizedKeyword)) {
        foundCount++;
        updates.push({
          id: keyword.id,
          status: 'found',
        });
      } else {
        updates.push({
          id: keyword.id,
          status: 'not_found',
        });
      }
    }

    // 4. Batch update
    if (updates.length > 0) {
      const updatePromises = updates.map(updateData => {
        const { id, ...dataToUpdate } = updateData;
        return supabaseAdmin.from('keyword_check_items').update(dataToUpdate).eq('id', id);
      });
      await Promise.all(updatePromises);
    }
    
    // 5. Update post status
    const allFound = foundCount === keywords.length && keywords.length > 0;
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