// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, settings, payload } = await req.json();

    if (!settings || !settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
      throw new Error("Thông tin cấu hình Chatwoot không đầy đủ.");
    }

    const client = axios.create({
      baseURL: `${settings.chatwootUrl}/api/v1/accounts/${settings.accountId}`,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': settings.apiToken,
      },
    });

    let response;

    switch (action) {
      case 'list_conversations':
        if (!settings.inboxId) throw new Error("Inbox ID is required.");
        response = await client.get(`/inboxes/${settings.inboxId}/conversations`);
        break;
      // Thêm các action khác ở đây trong tương lai (ví dụ: get_messages, send_message)
      default:
        throw new Error(`Hành động không hợp lệ: ${action}`);
    }

    return new Response(
      JSON.stringify(response.data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error("Chatwoot Proxy Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.message;
    return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: error.response?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})