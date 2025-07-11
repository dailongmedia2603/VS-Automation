// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, settings } = await req.json();

    if (!settings || !settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
      throw new Error("Thông tin cấu hình Chatwoot không đầy đủ.");
    }

    let endpoint = '';
    let method = 'GET';
    
    switch (action) {
      case 'list_conversations':
        // Đã đơn giản hóa đường dẫn, không cần Inbox ID ở đây nữa
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations`;
        method = 'GET';
        break;
      default:
        throw new Error(`Hành động không hợp lệ: ${action}`);
    }

    const upstreamUrl = `${settings.chatwootUrl.replace(/\/$/, '')}${endpoint}`;

    const response = await fetch(upstreamUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': settings.apiToken,
      },
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        if (!response.ok) {
             throw new Error(`API request failed with status ${response.status}: ${responseText}`);
        }
        throw new Error("Received a successful but non-JSON response from the API.");
    }

    if (!response.ok) {
        const errorMessage = data?.message || `API request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Chatwoot Proxy Error:", error.message);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})