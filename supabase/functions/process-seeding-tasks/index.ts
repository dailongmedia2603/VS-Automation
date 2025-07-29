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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 1. Find a pending task
    const { data: task, error: findError } = await supabaseAdmin
      .from('seeding_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (findError || !task) {
      return new Response(JSON.stringify({ message: "No pending tasks to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Set task to running
    await supabaseAdmin.from('seeding_tasks').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', task.id);

    // 3. Get posts for the task
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type')
      .eq('project_id', task.project_id)
      .eq('status', 'checking');
    
    if (postsError) throw postsError;

    // 4. Process each post sequentially
    let processedCount = 0;
    for (const post of posts) {
      // Check if task was cancelled before processing next post
      const { data: currentTask } = await supabaseAdmin.from('seeding_tasks').select('status').eq('id', task.id).single();
      if (currentTask.status === 'cancelled') {
        await supabaseAdmin.from('seeding_tasks').update({ updated_at: new Date().toISOString() }).eq('id', task.id);
        break; // Exit loop
      }

      try {
        // Re-use existing check logic
        if (post.type === 'comment_check') {
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-comments', { body: { fbPostId: post.links } });
            if (fetchError || fetchData.error) throw new Error(fetchError?.message || fetchData?.error);
            const { data: processData, error: processError } = await supabaseAdmin.functions.invoke('process-and-store-comments', { body: { rawResponse: fetchData.rawResponse, internalPostId: post.id } });
            if (processError || processData.error) throw new Error(processError?.message || processData?.error);
            await supabaseAdmin.functions.invoke('compare-and-update-comments', { body: { postId: post.id } });
        } else if (post.type === 'post_approval') {
            const timeCheckString = `&since=${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}&until=${new Date().toISOString()}`;
            const { data: fetchData, error: fetchError } = await supabaseAdmin.functions.invoke('get-fb-duyetpost', { body: { postId: post.id, timeCheckString } });
            if (fetchError || (fetchData && fetchData.error)) throw new Error(fetchError?.message || fetchData?.error);
            const { data: processData, error: processError } = await supabaseAdmin.functions.invoke('process-and-store-duyetpost', { body: { allPosts: fetchData.allPosts, internalPostId: post.id } });
            if (processError || (processData && processData.error)) throw new Error(processError?.message || processData?.error);
            await supabaseAdmin.functions.invoke('compare-and-update-duyetpost', { body: { postId: post.id } });
        }
        processedCount++;
        await supabaseAdmin.from('seeding_tasks').update({ progress_current: processedCount, updated_at: new Date().toISOString() }).eq('id', task.id);
      } catch (postError) {
        console.error(`Error processing post ${post.id}:`, postError.message);
        // Continue to next post even if one fails
      }
    }

    // 5. Finalize task status
    const { data: finalTask } = await supabaseAdmin.from('seeding_tasks').select('status').eq('id', task.id).single();
    if (finalTask.status !== 'cancelled') {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', task.id);
    }

    return new Response(JSON.stringify({ message: `Task ${task.id} processed.`, processed: processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // If the worker itself fails, try to mark the task as failed
    const { data: task } = await supabaseAdmin.from('seeding_tasks').select('id').eq('status', 'running').limit(1).single();
    if (task) {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'failed', error_message: error.message }).eq('id', task.id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})