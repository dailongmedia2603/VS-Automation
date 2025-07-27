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
      .select('api_url, api_key')
      .eq('id', 1)
      .single();

    if (settingsError || !fbSettings || !fbSettings.api_key) {
      throw new Error("Không thể tải cấu hình API Facebook. Vui lòng kiểm tra trang Cài đặt.");
    }

    const { api_url: apiUrl, api_key: accessToken } = fbSettings;
    const finalApiUrl = apiUrl || 'http://api.akng.io.vn/graph';
    
    // Request all necessary fields for the check
    const fields = 'message,from{id,name},permalink_url,created_time';
    const fbApiEndpoint = `${finalApiUrl}/${postId}/comments?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(fbApiEndpoint);
    const rawResponse = await response.text();
    const data = JSON.parse(rawResponse);

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}.`;
      throw new Error(errorMessage);
    }

    const responseData = {
        data: Array.isArray(data.data) ? data.data : [],
        log: {
            requestUrl: fbApiEndpoint,
            rawResponse: rawResponse,
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