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

  try {
    const { postId } = await req.json();
    if (!postId) {
      throw new Error("ID bài viết là bắt buộc.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
        if (initialEndpoint.includes('?')) {
            initialEndpoint += `&access_token=${dbAccessToken}`;
        } else {
            initialEndpoint += `?access_token=${dbAccessToken}`;
        }
    }

    let allComments = [];
    let allRawResponses = [];
    let nextUrl = initialEndpoint;

    // Loop to handle pagination
    while (nextUrl) {
      const response = await fetch(nextUrl);
      const rawResponse = await response.text();
      const data = JSON.parse(rawResponse);

      if (!response.ok) {
        const errorMessage = data?.error?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}.`;
        throw new Error(errorMessage);
      }
      
      allRawResponses.push(data);

      if (Array.isArray(data.data)) {
        allComments.push(...data.data);
      }

      // Check for the next page link and update the URL for the next loop iteration
      nextUrl = data.paging?.next || null;
    }

    const responseData = {
        data: allComments,
        log: {
            requestUrl: initialEndpoint,
            rawResponse: JSON.stringify(allRawResponses, null, 2), // Log all responses
        }
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching Facebook comments:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})