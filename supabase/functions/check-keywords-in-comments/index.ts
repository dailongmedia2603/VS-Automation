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
    // 1. Get post to retrieve keywords
    const { data: post, error: postError } = await supabaseAdmin
      .from('keyword_check_posts')
      .select('keywords, type')
      .eq('id', postId)
      .single();
    if (postError || !post) throw new Error("Không tìm thấy post hoặc không thể lấy từ khóa.");

    const keywords = (post.keywords || '').split('\n').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) throw new Error("Chưa có từ khóa nào được cấu hình cho post này.");

    // 2. Get all items (comments or post content) to check
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('keyword_check_items')
      .select('id, content')
      .eq('post_id', postId);
    if (itemsError) throw new Error("Lỗi lấy danh sách nội dung cần kiểm tra.");

    // 3. Compare and prepare updates
    const updates = [];
    let itemsWithFoundKeywords = 0;

    for (const item of items) {
      const normalizedContent = normalizeString(item.content);
      const foundKeywords = keywords.filter(kw => normalizedContent.includes(normalizeString(kw)));
      
      if (foundKeywords.length > 0) {
        itemsWithFoundKeywords++;
      }

      updates.push({
        id: item.id,
        status: foundKeywords.length > 0 ? 'found' : 'not_found',
        found_keywords: foundKeywords.length > 0 ? foundKeywords : null,
      });
    }

    // 4. Batch update items
    if (updates.length > 0) {
      const updatePromises = updates.map(updateData => {
        const { id, ...dataToUpdate } = updateData;
        return supabaseAdmin.from('keyword_check_items').update(dataToUpdate).eq('id', id);
      });
      await Promise.all(updatePromises);
    }
    
    // 5. Update parent post status
    const allItemsFound = itemsWithFoundKeywords === items.length && items.length > 0;
    await supabaseAdmin.from('keyword_check_posts').update({ status: allItemsFound ? 'completed' : 'pending' }).eq('id', postId);

    const result = { found: itemsWithFoundKeywords, notFound: items.length - itemsWithFoundKeywords, total: items.length };
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