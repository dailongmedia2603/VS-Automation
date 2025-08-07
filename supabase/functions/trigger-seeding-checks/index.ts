// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const parseFrequency = (freq) => {
  if (!freq) return null;
  const [value, unit] = freq.split('_');
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return null;

  switch (unit) {
    case 'minute': return numValue * 60 * 1000;
    case 'hour': return numValue * 60 * 60 * 1000;
    case 'day': return numValue * 24 * 60 * 60 * 1000;
    default: return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[trigger-seeding-checks] Function started at ${new Date().toISOString()}`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("[trigger-seeding-checks] Fetching active seeding posts...");
    const { data: posts, error: fetchError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type, check_frequency, last_checked_at')
      .eq('is_active', true)
      .eq('status', 'checking');

    if (fetchError) throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    
    console.log(`[trigger-seeding-checks] Found ${posts.length} active posts.`);

    const now = new Date();
    const postsToScan = [];

    for (const post of posts) {
      console.log(`[trigger-seeding-checks] Checking post ID: ${post.id}`);
      const interval = parseFrequency(post.check_frequency);
      if (!interval) {
        console.log(`  - Post ${post.id} has invalid frequency: ${post.check_frequency}. Skipping.`);
        continue;
      }

      const lastScanned = post.last_checked_at ? new Date(post.last_checked_at) : null;
      const timeSinceLastScan = lastScanned ? now.getTime() - lastScanned.getTime() : Infinity;

      console.log(`  - Interval: ${interval}ms`);
      console.log(`  - Last scanned: ${lastScanned ? lastScanned.toISOString() : 'Never'}`);
      console.log(`  - Time since last scan: ${timeSinceLastScan}ms`);

      if (!lastScanned || timeSinceLastScan >= interval) {
        console.log(`  - Post ${post.id} is DUE for scanning. Adding to queue.`);
        postsToScan.push(post);
      } else {
        console.log(`  - Post ${post.id} is NOT YET due for scanning. Skipping.`);
      }
    }

    if (postsToScan.length === 0) {
      console.log("[trigger-seeding-checks] No posts are due for scanning at this time.");
      return new Response(JSON.stringify({ message: "No posts due for scanning." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[trigger-seeding-checks] Triggering scans for ${postsToScan.length} posts: [${postsToScan.map(p => p.id).join(', ')}]`);

    const scanPromises = postsToScan.map(async (post) => {
      const logPayload: any = { post_id: post.id, type: post.type };
      try {
        await supabaseAdmin.from('seeding_posts').update({ last_checked_at: new Date().toISOString() }).eq('id', post.id);

        if (post.type === 'comment_check') {
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-comments', { body: { fbPostId: post.links } });
            logPayload.request_url = fetchData?.requestUrl;
            try { logPayload.raw_response = fetchData?.rawResponse ? JSON.parse(fetchData.rawResponse) : { content: fetchData.rawResponse }; } catch (e) { logPayload.raw_response = { error: "Failed to parse raw response", content: fetchData.rawResponse }; }
            if (fetchError || fetchData.error) throw new Error(fetchError?.message || fetchData?.error);
            
            await supabaseAdmin.functions.invoke('process-and-store-comments', { body: { rawResponse: fetchData.rawResponse, internalPostId: post.id } });
            await supabaseAdmin.functions.invoke('compare-and-update-comments', { body: { postId: post.id } });

        } else if (post.type === 'post_approval') {
            const timeCheckString = `&since=${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}&until=${new Date().toISOString()}`;
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-duyetpost', { body: { postId: post.id, timeCheckString } });
            logPayload.request_url = fetchData?.requestUrl;
            try { logPayload.raw_response = fetchData?.rawResponse ? JSON.parse(fetchData.rawResponse) : { content: fetchData.rawResponse }; } catch (e) { logPayload.raw_response = { error: "Failed to parse raw response", content: fetchData.rawResponse }; }
            if (fetchError || (fetchData && fetchData.error)) throw new Error(fetchError?.message || fetchData?.error);
            
            await supabaseAdmin.functions.invoke('process-and-store-duyetpost', { body: { allPosts: fetchData.allPosts, internalPostId: post.id } });
            await supabaseAdmin.functions.invoke('compare-and-update-duyetpost', { body: { postId: post.id } });
        }
        
        logPayload.status = 'success';
        await supabaseAdmin.from('logs_check_seeding_cmt_tu_dong').insert(logPayload);
        
        console.log(`[trigger-seeding-checks] Successfully processed post ID ${post.id}.`);
        return { id: post.id, status: 'success' };
      } catch (error) {
        console.error(`[trigger-seeding-checks] Failed to scan post ID ${post.id}:`, error.message);
        logPayload.status = 'error';
        logPayload.error_message = error.message;
        await supabaseAdmin.from('logs_check_seeding_cmt_tu_dong').insert(logPayload);
        return { id: post.id, status: 'error', message: error.message };
      }
    });

    const results = await Promise.all(scanPromises);

    return new Response(JSON.stringify({ message: "Scheduled seeding checks triggered.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[trigger-seeding-checks] CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})