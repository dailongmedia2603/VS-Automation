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

  const { fbPostId, templateKey } = await req.json();
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
    const keyToUse = templateKey || 'comment_check';
    const template = urlTemplates?.[keyToUse];

    if (!template) {
        throw new Error(`Chưa cấu hình URL cho tính năng: ${keyToUse}.`);
    }

    const url = new URL(template.replace(/{postId}/g, fbPostId));
    const simplifiedFields = 'message,from,permalink_url,created_time,comments{message,from,permalink_url,created_time}';
    url.searchParams.set('fields', simplifiedFields);
    url.searchParams.set('limit', '100'); // Set a limit for pagination
    if (!url.searchParams.has('access_token') && dbAccessToken) {
        url.searchParams.set('access_token', dbAccessToken);
    }
    requestUrl = url.toString();

    let allComments = [];
    let nextUrl: string | null = requestUrl;
    let firstRawResponse: string | null = null;
    const MAX_PAGES = 5; // Limit to prevent infinite loops
    let pagesFetched = 0;

    while (nextUrl && pagesFetched < MAX_PAGES) {
      pagesFetched++;
      const response = await fetch(nextUrl);
      const responseText = await response.text();

      if (firstRawResponse === null) {
        firstRawResponse = responseText;
      }

      if (!response.ok) {
          let errorData;
          try {
              errorData = JSON.parse(responseText);
          } catch(e) {
              errorData = { error: { message: responseText }};
          }
          const errorMessage = errorData?.error?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}.`;
          // If one page fails, we still return what we have so far.
          console.warn(`API error on page ${pagesFetched}: ${errorMessage}`);
          break; 
      }

      const pageData = JSON.parse(responseText);
      
      // Handle both direct response and proxy-wrapped response
      const commentsOnPage = pageData?.data?.data || pageData?.data || [];
      allComments.push(...commentsOnPage);

      // Handle both direct response and proxy-wrapped response for paging
      const paging = pageData?.data?.paging || pageData?.paging;
      nextUrl = paging?.next || null;
    }

    // The final raw response should be a JSON object containing an array of all comments
    const finalRawResponse = JSON.stringify({ data: allComments });

    return new Response(JSON.stringify({ rawResponse: finalRawResponse, requestUrl }), {
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