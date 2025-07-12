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
    const requestBody = await req.json();
    const { action, settings, conversationId, content, isPrivate, labels } = requestBody;

    if (!settings || !settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
      throw new Error("Thông tin cấu hình Chatwoot không đầy đủ.");
    }

    let endpoint = '';
    let method = 'GET';
    let body = null;
    
    switch (action) {
      case 'list_conversations':
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations?assignee_type=all&status=all&page=1`;
        method = 'GET';
        break;
      
      case 'list_messages':
        if (!conversationId) throw new Error("Conversation ID is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/messages`;
        method = 'GET';
        break;

      case 'send_message':
        if (!conversationId) throw new Error("Conversation ID is required.");
        if (!content) throw new Error("Message content is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/messages`;
        method = 'POST';
        body = JSON.stringify({
          content: content,
          message_type: 'outgoing',
          private: !!isPrivate,
        });
        break;

      case 'mark_as_read':
        if (!conversationId) throw new Error("Conversation ID is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/update_last_seen`;
        method = 'POST';
        body = JSON.stringify({});
        break;

      case 'update_labels':
        if (!conversationId) throw new Error("Conversation ID is required.");
        if (labels === undefined) throw new Error("Labels array is required.");
        endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/labels`;
        method = 'POST';
        body = JSON.stringify({ labels });
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
        if (responseText === '') { data = {}; } 
        else { data = JSON.parse(responseText); }
    } catch (e) {
        if (!response.ok) { throw new Error(`API request failed with status ${response.status}: ${responseText}`); }
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