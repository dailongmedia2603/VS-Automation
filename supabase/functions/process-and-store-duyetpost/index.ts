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

  const { rawResponse, internalPostId, groupId } = await req.json();
  if (!rawResponse || !internalPostId || !groupId) {
    return new Response(JSON.stringify({ error: "Dữ liệu thô, ID nội bộ và ID group là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const data = JSON.parse(rawResponse);
    const posts = data.data || [];

    // Clear old data for this specific post and group
    const { error: deleteError } = await supabaseAdmin
      .from('actual_duyetpost')
      .delete()
      .eq('post_id', internalPostId)
      .eq('group_id', groupId);
    if (deleteError) throw new Error(`Không thể dọn dẹp dữ liệu cũ: ${deleteError.message}`);

    // Insert new data
    if (posts.length > 0) {
      const postsToInsert = posts.map(post => ({
        post_id: internalPostId,
        group_id: groupId,
        message: post.message,
        account_name: post.from?.name,
        account_id: post.from?.id,
        post_link: post.permalink_url,
        created_time: post.created_time,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('actual_duyetpost')
        .insert(postsToInsert);
      if (insertError) throw new Error(`Không thể lưu dữ liệu mới: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, count: posts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in process-and-store-duyetpost function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})