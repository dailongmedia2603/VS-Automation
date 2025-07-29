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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: posts, error: fetchError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type, check_frequency, last_checked_at')
      .eq('is_active', true)
      .eq('status', 'checking');

    if (fetchError) throw new Error(`Failed to fetch posts: ${fetchError.message}`);

    const now = new Date();
    const postsToCheck = [];

    for (const post of posts) {
      const interval = parseFrequency(post.check_frequency);
      if (!interval) continue;

      const lastChecked = post.last_checked_at ? new Date(post.last_checked_at) : null;

      if (!lastChecked || (now.getTime() - lastChecked.getTime()) >= interval) {
        postsToCheck.push(post);
      }
    }

    if (postsToCheck.length === 0) {
      return new Response(JSON.stringify({ message: "No posts due for checking." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const checkPromises = postsToCheck.map(async (post) => {
      try {
        console.log(`Checking post ID: ${post.id}, type: ${post.type}`);
        
        await supabaseAdmin.from('seeding_posts').update({ last_checked_at: now.toISOString() }).eq('id', post.id);

        if (post.type === 'comment_check') {
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-comments', { body: { fbPostId: post.links } });
            if (fetchError || fetchData.error) throw new Error(fetchError?.message || fetchData?.error);

            const { data: processData, error: processError } = await supabaseAdmin.functions.invoke('process-and-store-comments', { body: { rawResponse: fetchData.rawResponse, internalPostId: post.id } });
            if (processError || processData.error) throw new Error(processError?.message || processData?.error);

            await supabaseAdmin.functions.invoke('compare-and-update-comments', { body: { postId: post.id } });

        } else if (post.type === 'post_approval') {
            const sinceDate = post.last_checked_at ? new Date(post.last_checked_at) : new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            const untilDate = now;
            const timeCheckString = `&since=${sinceDate.toISOString()}&until=${untilDate.toISOString()}`;
            
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-duyetpost', { body: { postId: post.id, timeCheckString } });
            if (fetchError || (fetchData && fetchData.error)) throw new Error(fetchError?.message || fetchData?.error);

            const { data: processData, error: processError } = await supabaseAdmin.functions.invoke('process-and-store-duyetpost', { body: { allPosts: fetchData.allPosts, internalPostId: post.id } });
            if (processError || (processData && processData.error)) throw new Error(processError?.message || processData?.error);

            await supabaseAdmin.functions.invoke('compare-and-update-duyetpost', { body: { postId: post.id } });
        }
        
        return { id: post.id, status: 'success' };
      } catch (error) {
        console.error(`Failed to check post ID ${post.id}:`, error.message);
        return { id: post.id, status: 'error', message: error.message };
      }
    });

    const results = await Promise.all(checkPromises);

    return new Response(JSON.stringify({ message: "Scheduled checks triggered.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in trigger-scheduled-checks function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})