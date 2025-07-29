// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) {
      throw new Error("Project ID is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: postsToCheck, error: fetchError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type')
      .eq('project_id', projectId)
      .eq('status', 'checking');

    if (fetchError) throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    if (postsToCheck.length === 0) {
      return new Response(JSON.stringify({ message: "Tất cả các bài viết đã được hoàn thành!" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const now = new Date();
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
            const sinceDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // Check last 5 days for manual check all
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
    const successCount = results.filter(r => r.status === 'success').length;

    return new Response(JSON.stringify({ message: `Đã quét ${postsToCheck.length} bài viết. ${successCount} thành công.`, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in check-all-posts-for-project function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})