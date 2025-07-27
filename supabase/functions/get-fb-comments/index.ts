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

    if (settingsError || !fbSettings || !fbSettings.api_key || !fbSettings.url_templates) {
      throw new Error("Không thể tải cấu hình API Facebook. Vui lòng kiểm tra trang Cài đặt.");
    }

    const { url_templates: urlTemplates, api_key: accessToken } = fbSettings;
    
    const urlTemplate = urlTemplates.get_comments;
    if (!urlTemplate) {
        throw new Error("Chưa cấu hình URL cho tính năng 'Lấy bình luận' trong Cài đặt.");
    }

    // Replace placeholder and append access token
    const baseUrl = urlTemplate.replace('{postId}', postId);
    const separator = baseUrl.includes('?') ? '&' : '?';
    const initialEndpoint = `${baseUrl}${separator}access_token=${accessToken}`;

    let allComments = [];
    let nextUrl = initialEndpoint;
    let firstResponseForLog = null;

    // Loop to handle pagination
    while (nextUrl) {
      const response = await fetch(nextUrl);
      const rawResponse = await response.text();
      const data = JSON.parse(rawResponse);

      if (!response.ok) {
        const errorMessage = data?.error?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}.`;
        throw new Error(errorMessage);
      }
      
      if (!firstResponseForLog) {
        firstResponseForLog = rawResponse;
      }

      if (Array.isArray(data.data)) {
        allComments.push(...data.data);
      }

      // Check for the next page link
      nextUrl = data.paging?.next || null;
    }

    const responseData = {
        data: allComments,
        log: {
            requestUrl: initialEndpoint,
            rawResponse: firstResponseForLog, // Log the first response for debugging
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