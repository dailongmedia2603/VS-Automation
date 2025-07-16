// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const toISOStringSafe = (timestamp) => {
  if (typeof timestamp === 'number' && !isNaN(timestamp)) {
    return new Date(timestamp * 1000).toISOString();
  }
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  // Fallback to current time if timestamp is invalid
  return new Date().toISOString();
};

async function fetchAllPages(endpoint, config) {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${config.url.replace(/\/$/, '')}/api/v1/accounts/${config.accountId}${endpoint}?page=${page}`;
    const response = await fetch(url, { headers: { 'api_access_token': config.apiToken } });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Chatwoot API Error for ${endpoint} page ${page}: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const payload = data.payload || data.data || data;
    
    if (Array.isArray(payload) && payload.length > 0) {
      allData.push(...payload);
      const meta = data.meta;
      if (meta && meta.current_page >= meta.total_pages) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  return allData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("--- Starting Chatwoot data sync ---");
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

    // 1. Sync Labels
    const chatwootLabels = await fetchAllPages('/labels', chatwootConfig);
    if (chatwootLabels && chatwootLabels.length > 0) {
      const labelsToUpsert = chatwootLabels.map(l => ({ id: l.id, name: l.title, color: l.color }));
      await supabaseAdmin.from('chatwoot_labels').upsert(labelsToUpsert, { onConflict: 'id' });
      console.log(`Synced ${chatwootLabels.length} labels.`);
    }

    // 2. Sync Conversations and Contacts
    const conversations = await fetchAllPages('/conversations', chatwootConfig);
    if (!conversations || conversations.length === 0) {
      console.log("No conversations found to sync.");
      return new Response(JSON.stringify({ status: 'success', message: 'No conversations found to sync.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Found ${conversations.length} conversations to sync.`);

    const contactsToUpsert = [];
    const conversationsToUpsert = [];
    const conversationLabelsToUpsert = [];
    const dbLabelMap = new Map(chatwootLabels.map(l => [l.title, l.id]));

    for (const convo of conversations) {
      // Chatwoot API returns contact object inside conversation
      if (convo.contact) {
        contactsToUpsert.push({
          id: convo.contact.id,
          name: convo.contact.name,
          email: convo.contact.email,
          phone_number: convo.contact.phone_number,
          thumbnail_url: convo.contact.thumbnail,
        });
      }

      conversationsToUpsert.push({
        id: convo.id,
        contact_id: convo.contact?.id,
        status: convo.status,
        last_activity_at: toISOStringSafe(convo.last_activity_at),
        unread_count: convo.unread_count,
      });

      if (convo.labels && convo.labels.length > 0) {
        for (const labelName of convo.labels) {
          if (dbLabelMap.has(labelName)) {
            conversationLabelsToUpsert.push({
              conversation_id: convo.id,
              label_id: dbLabelMap.get(labelName)
            });
          }
        }
      }
    }

    // Batch upsert data to Supabase
    if (contactsToUpsert.length > 0) await supabaseAdmin.from('chatwoot_contacts').upsert(contactsToUpsert, { onConflict: 'id' });
    if (conversationsToUpsert.length > 0) await supabaseAdmin.from('chatwoot_conversations').upsert(conversationsToUpsert, { onConflict: 'id' });

    // Sync labels by deleting and re-inserting for all synced conversations
    const conversationIds = conversations.map(c => c.id);
    await supabaseAdmin.from('chatwoot_conversation_labels').delete().in('conversation_id', conversationIds);
    if (conversationLabelsToUpsert.length > 0) {
      await supabaseAdmin.from('chatwoot_conversation_labels').upsert(conversationLabelsToUpsert);
    }

    console.log(`--- Sync complete. Synced ${conversations.length} conversations and ${contactsToUpsert.length} contacts. ---`);
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