// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const toISOStringSafe = (timestamp) => {
  if (typeof timestamp === "number" && !isNaN(timestamp)) {
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

async function fetchFromChatwoot(endpoint, config, params = {}) {
  const base = config.url.replace(/\/$/, "");
  const url = new URL(`${base}/api/v1/accounts/${config.accountId}${endpoint}`);

  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((x) => url.searchParams.append(`${k}[]`, String(x)));
    } else {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString(), {
    headers: { api_access_token: config.apiToken },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chatwoot API Error ${res.status} @ ${endpoint}: ${body}`);
  }
  
  const json = await res.json();
  if (json.data && Array.isArray(json.data.payload)) return json.data.payload;
  if (Array.isArray(json.payload)) return json.payload;
  return json.data?.payload || json.payload || json;
}

async function fetchAllFromChatwoot(endpoint, config, params = {}) {
  const allItems = [];
  let page = 1;
  while (true) {
    const pageItems = await fetchFromChatwoot(endpoint, config, { ...params, page });
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    allItems.push(...pageItems);
    page++;
  }
  return allItems;
}

async function syncBasicConversationData(supabase, convo, labelMap) {
  if (!convo.meta || !convo.meta.sender) {
    console.warn(`Skipping conversation ID ${convo.id} due to missing sender data.`);
    return;
  }

  const { meta, labels } = convo;
  const sender = meta.sender;

  // 1. Sync Contact
  await supabase.from("chatwoot_contacts").upsert({
    id: sender.id,
    name: sender.name,
    email: sender.email,
    phone_number: sender.phone_number,
    thumbnail_url: sender.thumbnail,
  }, { onConflict: "id" });

  // 2. Sync Conversation
  await supabase.from("chatwoot_conversations").upsert({
    id: convo.id,
    contact_id: sender.id,
    status: convo.status,
    last_activity_at: toISOStringSafe(convo.last_activity_at),
    unread_count: convo.unread_count,
  }, { onConflict: "id" });

  // 3. Sync Labels (nhiều-nhiều)
  await supabase.from("chatwoot_conversation_labels").delete().eq("conversation_id", convo.id);
  if (labels?.length) {
    const links = labels
      .filter((name) => labelMap.has(name))
      .map((name) => ({
        conversation_id: convo.id,
        label_id: labelMap.get(name),
      }));
    if (links.length) {
      await supabase.from("chatwoot_conversation_labels").insert(links);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: settings, error } = await supabaseAdmin
      .from("chatwoot_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (error || !settings) {
      throw new Error("Không tìm thấy Chatwoot settings trong database.");
    }
    const config = {
      url: settings.chatwoot_url,
      accountId: settings.account_id,
      apiToken: settings.api_token,
    };

    // Sync toàn bộ labels trước để đảm bảo map chính xác
    const chatwootLabels = await fetchAllFromChatwoot('/labels', config);
    if (chatwootLabels && chatwootLabels.length > 0) {
      const labelsToUpsert = chatwootLabels.map(l => ({ id: l.id, name: l.title, color: l.color }));
      await supabaseAdmin.from('chatwoot_labels').upsert(labelsToUpsert, { onConflict: 'id' });
    }
    const labelMap = new Map(chatwootLabels.map((l) => [l.title, l.id]));

    // Lấy tất cả conversation, không lọc theo status
    const conversations = await fetchAllFromChatwoot("/conversations", config);

    if (conversations.length === 0) {
      return new Response(
        JSON.stringify({ message: "Không có conversation nào để sync." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Đồng bộ song song chỉ thông tin cơ bản
    await Promise.all(
      conversations.map((c) => syncBasicConversationData(supabaseAdmin, c, labelMap))
    );

    return new Response(
      JSON.stringify({ status: "success", synced_conversations: conversations.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-chatwoot-data error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});