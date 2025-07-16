// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

console.log(`[${new Date().toISOString()}] --- FULL LOGIC DEPLOYMENT (fb-messenger-gateway v-final) ---`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Helper Functions for Chatwoot API ---

async function findOrCreateContact(psid, userName, chatwootConfig) {
  const { url, accountId, apiToken, inboxId } = chatwootConfig;
  const searchUrl = `${url}/api/v1/accounts/${accountId}/contacts/search?q=${psid}`;
  
  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: { 'api_access_token': apiToken },
  });

  const searchResult = await searchResponse.json();
  const existingContact = searchResult.payload.find(c => c.source_id === psid);

  if (existingContact) {
    return existingContact;
  }

  const createUrl = `${url}/api/v1/accounts/${accountId}/contacts`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': apiToken },
    body: JSON.stringify({
      inbox_id: inboxId,
      name: userName,
      source_id: psid,
    }),
  });

  const createResult = await createResponse.json();
  return createResult.payload.contact;
}

async function createConversation(contact, chatwootConfig) {
  const { url, accountId, apiToken, inboxId } = chatwootConfig;
  const convUrl = `${url}/api/v1/accounts/${accountId}/conversations`;

  const response = await fetch(convUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': apiToken },
    body: JSON.stringify({
      source_id: contact.source_id,
      inbox_id: inboxId,
      contact_id: contact.id,
    }),
  });

  return await response.json();
}

async function createMessage(conversationId, messageContent, chatwootConfig) {
  const { url, accountId, apiToken } = chatwootConfig;
  const messageUrl = `${url}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

  await fetch(messageUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api_access_token': apiToken },
    body: JSON.stringify({
      content: messageContent,
      message_type: 'incoming',
      private: false,
    }),
  });
}

async function getUserProfile(psid, facebookToken) {
    if (!facebookToken) {
        console.warn("FACEBOOK_PAGE_ACCESS_TOKEN is not set. Using PSID as username.");
        return { name: psid };
    }
    const url = `https://graph.facebook.com/${psid}?fields=first_name,last_name&access_token=${facebookToken}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Facebook API error (${response.status}): ${errorData.error.message}`);
        }
        const data = await response.json();
        return { name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || psid };
    } catch (error) {
        console.error("Error fetching user profile from Facebook:", error.message);
        return { name: psid };
    }
}

// --- Main Server Logic ---

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Webhook Verification (GET request) ---
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("Webhook verification failed. Tokens do not match.");
      return new Response('Forbidden', { status: 403 });
    }
  }

  // --- Handle Incoming Messages (POST request) ---
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      if (body.object === 'page') {
        const chatwootConfig = {
          url: Deno.env.get('CHATWOOT_URL'),
          accountId: Deno.env.get('CHATWOOT_ACCOUNT_ID'),
          inboxId: Deno.env.get('CHATWOOT_INBOX_ID'),
          apiToken: Deno.env.get('CHATWOOT_API_TOKEN'),
        };
        const facebookToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');

        for (const entry of body.entry) {
          for (const event of entry.messaging) {
            if (event.message && event.sender) {
              const psid = event.sender.id;
              const messageContent = event.message.text;
              const attachments = event.message.attachments;

              if (!messageContent && (!attachments || attachments.length === 0)) {
                continue;
              }

              const userProfile = await getUserProfile(psid, facebookToken);
              const contact = await findOrCreateContact(psid, userProfile.name, chatwootConfig);
              const conversation = await createConversation(contact, chatwootConfig);
              
              let finalContent = messageContent || '';
              if (attachments && attachments.length > 0) {
                  const attachmentText = attachments.map(att => `[Tệp đính kèm: ${att.type}]`).join('\\n');
                  finalContent = finalContent ? `${finalContent}\\n${attachmentText}` : attachmentText;
              }

              if (finalContent) {
                await createMessage(conversation.id, finalContent, chatwootConfig);
              }
            }
          }
        }
        return new Response('EVENT_RECEIVED', { status: 200 });
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error processing webhook event:', error.message);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
})