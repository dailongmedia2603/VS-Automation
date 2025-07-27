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

  const { postId } = await req.json();
  if (!postId) {
    return new Response(JSON.stringify({ error: "ID bài viết là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
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

    let initialEndpoint = commentCheckTemplate.replace(/{postId}/g, postId);
    if (!initialEndpoint.includes('access_token=') && dbAccessToken) {
        initialEndpoint += (initialEndpoint.includes('?') ? '&' : '?') + `access_token=${dbAccessToken}`;
    }

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

    const responseData = {
        data: allComments,
        log: { requestUrl: initialEndpoint }
    };
    
    // Log the successful response to the new table
    await supabaseAdmin.from('seeding_api_logs').insert({
        post_id: postId,
        raw_response: JSON.stringify(allComments, null, 2),
        status: 'success'
    });

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Log the error to the new table
    await supabaseAdmin.from('seeding_api_logs').insert({
        post_id: postId,
        raw_response: JSON.stringify({ error: error.message }),
        status: 'error',
        error_message: error.message
    });

    console.error('Error fetching Facebook comments:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})