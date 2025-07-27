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

  const { fbPostId } = await req.json();
  if (!fbPostId) {
    return new Response(JSON.stringify({ error: "ID bài viết Facebook là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  let requestUrl = '';

  try {
    const { data: fbSettings, error: settingsError } = await supabaseAdmin
      .from('apifb_settings')
      .select('url_templates, api_key')
      .eq('id', 1)
      .single();

    if (settingsError || !fbSettings) {
      throw new Error("Không thể tải cấu hình API Facebook.");
    }

    const { url_templates: urlTemplates, api_key: dbAccessToken } = fbSettings;
    const commentCheckTemplate = urlTemplates?.comment_check;

    if (!commentCheckTemplate) {
        throw new Error("Chưa cấu hình URL cho tính năng Check Comment.");
    }

    const url = new URL(commentCheckTemplate.replace(/{postId}/g, fbPostId));
    const simplifiedFields = 'message,from,permalink_url,created_time,comments';
    url.searchParams.set('fields', simplifiedFields);
    if (!url.searchParams.has('access_token') && dbAccessToken) {
        url.searchParams.set('access_token', dbAccessToken);
    }
    requestUrl = url.toString();

    const response = await fetch(requestUrl);
    const responseText = await response.text();

    if (!response.ok) {
        let errorData;
        try {
            errorData = JSON.parse(responseText);
        } catch(e) {
            errorData = { error: { message: responseText }};
        }
        const errorMessage = errorData?.error?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}.`;
        throw new Error(errorMessage);
    }

    return new Response(JSON.stringify({ rawResponse: responseText, requestUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-fb-comments function:', error.message);
    return new Response(JSON.stringify({ error: error.message, requestUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})