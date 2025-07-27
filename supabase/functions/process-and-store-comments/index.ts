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

  const { rawResponse, internalPostId } = await req.json();
  if (!rawResponse || !internalPostId) {
    return new Response(JSON.stringify({ error: "Dữ liệu thô và ID nội bộ là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const data = JSON.parse(rawResponse);
    const allComments = [];
    let nextUrl = null;

    // Handle paginated data from Facebook Graph API format
    if (data.data && Array.isArray(data.data)) {
        for (const comment of data.data) {
            allComments.push(comment);
            if (comment.comments && Array.isArray(comment.comments.data)) {
                allComments.push(...comment.comments.data);
            }
        }
        nextUrl = (data.paging && data.paging.next) ? data.paging.next : null;
    } 
    // Handle flat array format from custom APIs
    else if (Array.isArray(data)) {
        allComments.push(...data);
    }

    // If there's a next page, fetch it (simple one-level pagination for now)
    if (nextUrl) {
        const response = await fetch(nextUrl);
        const nextData = await response.json();
        if (nextData.data && Array.isArray(nextData.data)) {
            allComments.push(...nextData.data);
        }
    }

    // Clear old data
    const { error: deleteError } = await supabaseAdmin
      .from('actual_comments')
      .delete()
      .eq('post_id', internalPostId);
    if (deleteError) throw new Error(`Không thể dọn dẹp dữ liệu cũ: ${deleteError.message}`);

    // Insert new data
    if (allComments.length > 0) {
      const commentsToInsert = allComments.map(comment => ({
        post_id: internalPostId,
        message: comment.message,
        account_name: comment.from?.name,
        account_id: comment.from?.id,
        comment_link: comment.permalink_url,
        created_time: comment.created_time,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('actual_comments')
        .insert(commentsToInsert);
      if (insertError) throw new Error(`Không thể lưu dữ liệu mới: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, count: allComments.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in process-and-store-comments function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})