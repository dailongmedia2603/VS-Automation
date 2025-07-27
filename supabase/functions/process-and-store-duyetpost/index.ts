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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { allPosts, internalPostId } = await req.json();
  if (!allPosts || !internalPostId) {
    return new Response(JSON.stringify({ error: "Dữ liệu bài viết và ID nội bộ là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    // Clear all old data for this post to ensure a fresh import
    const { error: deleteError } = await supabaseAdmin
      .from('actual_duyetpost')
      .delete()
      .eq('post_id', internalPostId);
    if (deleteError) throw new Error(`Không thể dọn dẹp dữ liệu cũ: ${deleteError.message}`);

    // Proceed only if there's valid data to process
    if (allPosts && Array.isArray(allPosts) && allPosts.length > 0) {
      const postsToInsert = allPosts.map(post => {
        // Apply the user-defined mapping with safety checks
        const account_name = post.from && post.from.name ? post.from.name : null;
        const account_id = post.from && post.from.id ? post.from.id : null;

        return {
          post_id: internalPostId,
          group_id: post.group_id, // This is added by the 'get-fb-duyetpost' function
          message: post.message || null,
          account_name: account_name,
          account_id: account_id,
          post_link: post.permalink_url || null,
          created_time: post.created_time || null,
        };
      });

      const { error: insertError } = await supabaseAdmin
        .from('actual_duyetpost')
        .insert(postsToInsert);
      if (insertError) throw new Error(`Không thể lưu dữ liệu mới: ${insertError.message}`);
      
      return new Response(JSON.stringify({ success: true, count: postsToInsert.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // If allPosts is empty, report success with a count of 0
      return new Response(JSON.stringify({ success: true, count: 0, message: "No posts to insert." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  } catch (error) {
    console.error('Error in process-and-store-duyetpost function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})