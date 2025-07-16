// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const toISOStringSafe = (timestamp: number | string | undefined | null): string => {
  if (typeof timestamp === 'number' && !isNaN(timestamp)) {
    return new Date(timestamp * 1000).toISOString();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
};

async function fetchFromChatwoot(endpoint: string, config: any) {
  const url = `${config.url.replace(/\/$/, '')}/api/v1/accounts/${config.accountId}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'api_access_token': config.apiToken },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chatwoot API Error for ${endpoint}: ${response.status} ${errorBody}`);
  }
  const data = await response.json();
  // Handle different response structures from Chatwoot API
  if (Array.isArray(data.payload)) {
    return data.payload;
  }
  if (Array.isArray(data.data)) {
    return data.data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return []; // Return an empty array as a fallback
}

async function syncConversationData(supabase: SupabaseClient, convo: any, config: any) {
  console.log(`Syncing data for conversation ID: ${convo.id}`);
  const { sender, messages: initialMessages, labels } = convo;

  // 1. Sync Contact
  await supabase.from('chatwoot_contacts').upsert({
    id: sender.id,
    name: sender.name,
    email: sender.email,
    phone_number: sender.phone_number,
    thumbnail_url: sender.thumbnail,
  }, { onConflict: 'id' });

  // 2. Sync Conversation
  await supabase.from('chatwoot_conversations').upsert({
    id: convo.id,
    contact_id: sender.id,
    status: convo.status,
    last_activity_at: toISOStringSafe(convo.last_activity_at),
    unread_count: convo.unread_count,
  }, { onConflict: 'id' });

  // 3. Sync All Messages for the conversation
  const allMessages = await fetchFromChatwoot(`/conversations/${convo.id}/messages`, config);
  if (allMessages && allMessages.length > 0) {
    const messagesToUpsert = allMessages.map((msg: any) => ({
      id: msg.id,
      conversation_id: convo.id,
      content: msg.content,
      message_type: msg.message_type === 'incoming' ? 0 : 1,
      is_private: msg.private,
      sender_name: msg.sender?.name,
      sender_thumbnail: msg.sender?.thumbnail,
      created_at_chatwoot: toISOStringSafe(msg.created_at),
    }));
    await supabase.from('chatwoot_messages').upsert(messagesToUpsert, { onConflict: 'id' });

    // 4. Sync Attachments from all messages
    const allAttachments = allMessages.flatMap((msg: any) => 
      (msg.attachments || []).map((att: any) => ({
        id: att.id,
        message_id: msg.id,
        file_type: att.file_type,
        data_url: att.data_url,
      }))
    );
    if (allAttachments.length > 0) {
      await supabase.from('chatwoot_attachments').upsert(allAttachments, { onConflict: 'id' });
    }
  }

  // 5. Sync Labels
  if (labels && labels.length > 0) {
    const { data: allDbLabels, error } = await supabase.from('chatwoot_labels').select('name, id');
    if (error) {
        console.error("Error fetching DB labels:", error);
        return;
    }
    const dbLabelMap = new Map(allDbLabels.map(l => [l.name, l.id]));
    
    const labelLinksToInsert = [];
    for (const labelName of labels) {
      if (dbLabelMap.has(labelName)) {
        labelLinksToInsert.push({ conversation_id: convo.id, label_id: dbLabelMap.get(labelName) });
      }
    }
    
    await supabase.from('chatwoot_conversation_labels').delete().eq('conversation_id', convo.id);
    if (labelLinksToInsert.length > 0) {
      await supabase.from('chatwoot_conversation_labels').insert(labelLinksToInsert);
    }
  } else {
    await supabase.from('chatwoot_conversation_labels').delete().eq('conversation_id', convo.id);
  }
  console.log(`Finished syncing conversation ID: ${convo.id}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Starting sync-chatwoot-data function ---");
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from('chatwoot_settings').select('*').eq('id', 1).single();

    if (settingsError || !settingsData) {
      throw new Error("Chatwoot settings not found in the database.");
    }
    console.log("Successfully fetched Chatwoot settings.");

    const chatwootConfig = {
      url: settingsData.chatwoot_url,
      accountId: settingsData.account_id,
      apiToken: settingsData.api_token,
    };

    // Fetch all conversations without status filter for robustness
    const conversations = await fetchFromChatwoot(`/conversations`, config);
    
    if (!conversations || conversations.length === 0) {
      console.log("No conversations found to sync.");
      return new Response(JSON.stringify({ message: "No conversations found to sync." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`Found ${conversations.length} conversations to sync.`);

    const syncPromises = conversations.map(convo => syncConversationData(supabaseAdmin, convo, chatwootConfig));
    await Promise.all(syncPromises);

    console.log(`--- Sync complete. Synced ${conversations.length} conversations. ---`);
    return new Response(JSON.stringify({ status: 'success', synced_conversations: conversations.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-chatwoot-data function:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});