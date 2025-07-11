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
    const { action, settings, conversationId, messagePayload } = await req.json();

    if (!settings || !settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
      throw new Error("Thông tin cấu hình Chatwoot không đầy đủ.");
    }

    let endpoint = '';
    let method = 'GET';
    let body = undefined;
    
    switch (action) {
      case 'list_conversations':
        if (!settings.inboxId) throw new Error("Inbox ID is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations?inbox_id=${settings.inboxId}`;
        method = 'GET';
        break;
      case 'list_messages':
        if (!conversationId) throw new Error("Conversation ID is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/messages`;
        method = 'GET';
        break;
      case 'send_message':
        if (!conversationId) throw new Error("Conversation ID is required.");
        if (!messagePayload) throw new Error("Message payload is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/messages`;
        method = 'POST';
        body = JSON.stringify(messagePayload);
        break;
      case 'test_auth':
        endpoint = `/api/v1/accounts/${settings.accountId}/inboxes`;
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
      body: body,
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        if (!response.ok) {
             throw new Error(`Yêu cầu API thất bại với mã trạng thái ${response.status}. Vui lòng kiểm tra lại Chatwoot URL và Account ID của bạn.`);
        }
        throw new Error("Đã nhận được phản hồi không phải JSON không mong muốn từ API Chatwoot.");
    }

    if (!response.ok) {
        const errorMessage = data?.message || `Yêu cầu API thất bại với mã trạng thái ${response.status}`;
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