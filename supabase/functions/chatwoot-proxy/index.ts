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
    const contentType = req.headers.get('content-type') || '';
    let upstreamUrl = '';
    let upstreamOptions = {};

    // Handle multipart/form-data for file uploads
    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const settingsData = JSON.parse(formData.get('settings') as string);
        const conversationId = formData.get('conversationId') as string;

        const settings = {
            chatwootUrl: settingsData.chatwootUrl || settingsData.chatwoot_url,
            accountId: settingsData.accountId || settingsData.account_id,
            apiToken: settingsData.apiToken || settingsData.api_token,
        };

        if (!settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
            throw new Error("Thông tin cấu hình Chatwoot không đầy đủ.");
        }
        if (!conversationId) throw new Error("Conversation ID is required for sending a message.");

        formData.delete('settings');
        formData.delete('conversationId');

        upstreamUrl = `${settings.chatwootUrl.replace(/\/$/, '')}/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/messages`;
        upstreamOptions = {
            method: 'POST',
            headers: {
                'api_access_token': settings.apiToken,
            },
            body: formData,
        };
    } 
    // Handle JSON requests for other actions
    else {
        const requestBody = await req.json();
        const { action, settings: settingsData, conversationId, content, isPrivate, labels, contactId, payload } = requestBody;

        const settings = {
            chatwootUrl: settingsData.chatwootUrl || settingsData.chatwoot_url,
            accountId: settingsData.accountId || settingsData.account_id,
            apiToken: settingsData.apiToken || settingsData.api_token,
        };

        if (!settings.chatwootUrl || !settings.accountId || !settings.apiToken) {
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
          
          case 'get_conversation_details':
            if (!conversationId) throw new Error("Conversation ID is required.");
            endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}`;
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

          case 'mark_as_unread': // Changed from toggle_unread
            if (!conversationId) throw new Error("Conversation ID is required.");
            endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/update_last_seen`; // Changed endpoint
            method = 'POST';
            body = JSON.stringify({
              last_seen_at: 0 // Send a timestamp from the past (Unix epoch)
            });
            break;

          case 'update_labels':
            if (!conversationId) throw new Error("Conversation ID is required.");
            if (labels === undefined) throw new Error("Labels array is required.");
            endpoint = `/api/v1/accounts/${settings.accountId}/conversations/${conversationId}/labels`;
            method = 'POST';
            body = JSON.stringify({ labels });
            break;

          case 'update_contact':
            if (!contactId) throw new Error("Contact ID is required.");
            if (!payload) throw new Error("Payload for contact update is required.");
            endpoint = `/api/v1/accounts/${settings.accountId}/contacts/${contactId}`;
            method = 'PUT';
            body = JSON.stringify(payload);
            break;

          default:
            throw new Error(`Hành động không hợp lệ: ${action}`);
        }

        upstreamUrl = `${settings.chatwootUrl.replace(/\/$/, '')}${endpoint}`;
        
        console.log(`[Chatwoot Proxy] Calling upstream URL: ${method} ${upstreamUrl}`);

        upstreamOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': settings.apiToken,
            },
            body: body,
        };
    }

    const response = await fetch(upstreamUrl, upstreamOptions);

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