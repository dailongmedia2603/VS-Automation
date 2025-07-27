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

  const { fbPostId, internalPostId } = await req.json();
  if (!fbPostId || !internalPostId) {
    return new Response(JSON.stringify({ error: "Cả ID bài viết Facebook và ID nội bộ đều là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    // Step 1: Fetch API settings from Supabase
    const { data: fbSettings, error: settingsError } = await supabaseAdmin
      .from('apifb_settings')
      .select('url_templates, api_key')
      .eq('id', 1)
      .single();

    if (settingsError || !fbSettings) {
      throw new Error("Không thể tải cấu hình API Facebook. Vui lòng kiểm tra trang Cài đặt.");
    }

    const { url_templates: urlTemplates, api_key: dbAccessToken } = fbSettings;
    const commentCheckTemplate = urlTemplates?.comment_check;

    if (!commentCheckTemplate) {
        throw new Error("Chưa cấu hình URL cho tính năng Check Comment. Vui lòng vào trang Cài đặt.");
    }

    // Step 2: Fetch all comments from Facebook API with pagination
    const url = new URL(commentCheckTemplate.replace(/{postId}/g, fbPostId));
    const simplifiedFields = 'message,from,permalink_url,created_time,comments';
    url.searchParams.set('fields', simplifiedFields);
    if (!url.searchParams.has('access_token') && dbAccessToken) {
        url.searchParams.set('access_token', dbAccessToken);
    }
    const initialEndpoint = url.toString();

    const allComments = [];
    let nextUrl = initialEndpoint;
    let safetyCounter = 0;
    const MAX_PAGES = 20;

    while (nextUrl && safetyCounter < MAX_PAGES) {
      safetyCounter++;
      const response = await fetch(nextUrl);
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data?.error?.message || `Yêu cầu API thất bại ở trang ${safetyCounter} với mã trạng thái ${response.status}.`;
        throw new Error(errorMessage);
      }
      
      if (Array.isArray(data.data)) {
        for (const comment of data.data) {
          allComments.push(comment);
          if (comment.comments && Array.isArray(comment.comments.data)) {
            allComments.push(...comment.comments.data);
          }
        }
      }
      nextUrl = (data.paging && data.paging.next) ? data.paging.next : null;
    }

    // Step 3: Clear old data for this post from actual_comments table
    const { error: deleteError } = await supabaseAdmin
      .from('actual_comments')
      .delete()
      .eq('post_id', internalPostId);

    if (deleteError) {
      throw new Error(`Không thể dọn dẹp dữ liệu cũ: ${deleteError.message}`);
    }

    // Step 4: Insert new data into actual_comments table
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

      if (insertError) {
        throw new Error(`Không thể lưu dữ liệu mới: ${insertError.message}`);
      }
    }

    // Step 5: Log the successful operation
    await supabaseAdmin.from('seeding_api_logs').insert({
        post_id: internalPostId,
        raw_response: JSON.stringify({ count: allComments.length, message: "Data fetched and stored successfully." }),
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, message: `Đã lấy và lưu trữ ${allComments.length} bình luận.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    await supabaseAdmin.from('seeding_api_logs').insert({
        post_id: internalPostId,
        raw_response: JSON.stringify({ error: error.message }),
        status: 'error',
        error_message: error.message
    });

    console.error('Error in get-fb-comments function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})