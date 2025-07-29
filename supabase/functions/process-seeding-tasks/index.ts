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

  let task = null;

  try {
    // 1. Find a running or pending task
    let { data: runningTask, error: runningTaskError } = await supabaseAdmin
      .from('seeding_tasks')
      .select('*')
      .eq('status', 'running')
      .limit(1)
      .single();

    if (runningTaskError && runningTaskError.code !== 'PGRST116') throw runningTaskError;
    task = runningTask;

    if (!task) {
      let { data: pendingTask, error: pendingTaskError } = await supabaseAdmin
        .from('seeding_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (pendingTaskError && pendingTaskError.code !== 'PGRST116') throw pendingTaskError;
      task = pendingTask;
    }

    if (!task) {
      return new Response(JSON.stringify({ message: "No tasks to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Find the next post to process
    const { data: post, error: postError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type')
      .eq('project_id', task.project_id)
      .eq('status', 'checking')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (!post) {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'completed', current_post_id: null, updated_at: new Date().toISOString() }).eq('id', task.id);
      return new Response(JSON.stringify({ message: `Task ${task.id} completed.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. "Claim" the post by updating the task state BEFORE processing
    await supabaseAdmin.from('seeding_tasks').update({ status: 'running', current_post_id: post.id, updated_at: new Date().toISOString() }).eq('id', task.id);
    
    const { data: currentTaskStatus } = await supabaseAdmin.from('seeding_tasks').select('status').eq('id', task.id).single();
    if (currentTaskStatus.status === 'cancelled') {
        await supabaseAdmin.from('seeding_tasks').update({ current_post_id: null, updated_at: new Date().toISOString() }).eq('id', task.id);
        return new Response(JSON.stringify({ message: `Task ${task.id} was cancelled.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Process the post
    try {
      await supabaseAdmin.from('seeding_posts').update({ last_checked_at: new Date().toISOString() }).eq('id', post.id);

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
    } catch (postProcessingError) {
      console.error(`Error processing post ${post.id}:`, postProcessingError.message);
    }

    // 5. Update progress and release the "claim"
    const newProgress = task.progress_current + 1;
    const isCompleted = newProgress >= task.progress_total;
    
    const updateData = {
      progress_current: newProgress,
      current_post_id: null,
      updated_at: new Date().toISOString(),
      status: isCompleted ? 'completed' : 'running'
    };
    await supabaseAdmin.from('seeding_tasks').update(updateData).eq('id', task.id);

    return new Response(JSON.stringify({ message: `Task ${task.id} processed post ${post.id}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    if (task && task.id) {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'failed', error_message: error.message }).eq('id', task.id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})