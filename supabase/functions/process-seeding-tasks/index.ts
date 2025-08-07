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

  console.log(`[process-seeding-tasks] Function started at ${new Date().toISOString()}`);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let task = null;

  try {
    // 1. Handle potentially stuck tasks (running for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stuckTasks, error: stuckError } = await supabaseAdmin
      .from('seeding_tasks')
      .update({ status: 'failed', error_message: 'Task timed out after 5 minutes.' })
      .eq('status', 'running')
      .lt('updated_at', fiveMinutesAgo)
      .select();
    
    if (stuckError) console.error("[process-seeding-tasks] Error resetting stuck tasks:", stuckError);
    if (stuckTasks && stuckTasks.length > 0) {
      console.log(`[process-seeding-tasks] Reset ${stuckTasks.length} stuck task(s).`);
    }

    // 2. Find a task to process (prioritize running, then pending)
    let { data: runningTask, error: runningTaskError } = await supabaseAdmin
      .from('seeding_tasks')
      .select('*')
      .eq('status', 'running')
      .limit(1)
      .single();

    if (runningTaskError && runningTaskError.code !== 'PGRST116') throw runningTaskError;
    task = runningTask;

    if (task) {
      console.log(`[process-seeding-tasks] Resuming running task ID: ${task.id}`);
    } else {
      let { data: pendingTask, error: pendingTaskError } = await supabaseAdmin
        .from('seeding_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (pendingTaskError && pendingTaskError.code !== 'PGRST116') throw pendingTaskError;
      task = pendingTask;
      if (task) {
        console.log(`[process-seeding-tasks] Starting new pending task ID: ${task.id}`);
      }
    }

    if (!task) {
      console.log("[process-seeding-tasks] No tasks to process at this time.");
      return new Response(JSON.stringify({ message: "No tasks to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Find the next post to process
    console.log(`[process-seeding-tasks] Finding next post for project ID: ${task.project_id}`);
    const { data: post, error: postError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type')
      .eq('project_id', task.project_id)
      .eq('status', 'checking')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (!post) {
      // Double-check if there are any 'checking' posts left for this project.
      const { count: remainingCount, error: countCheckError } = await supabaseAdmin
        .from('seeding_posts')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', task.project_id)
        .eq('status', 'checking');

      if (countCheckError) throw countCheckError;

      if (remainingCount === 0) {
        // No posts are left to check, so the task is complete regardless of progress count.
        console.log(`[process-seeding-tasks] No more 'checking' posts found for project ${task.project_id}. Completing task ${task.id}.`);
        await supabaseAdmin.from('seeding_tasks').update({ status: 'completed', current_post_id: null, updated_at: new Date().toISOString() }).eq('id', task.id);
        return new Response(JSON.stringify({ message: `Task ${task.id} completed as no posts remain.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        // Posts exist but were not found by the query, which is a genuine error.
        const errorMessage = `Task ${task.id} failed. It could not find a post to process, but ${remainingCount} 'checking' post(s) still exist for this project.`;
        console.error(`[process-seeding-tasks] ${errorMessage}`);
        await supabaseAdmin.from('seeding_tasks').update({ status: 'failed', error_message: errorMessage, updated_at: new Date().toISOString() }).eq('id', task.id);
        return new Response(JSON.stringify({ message: `Task ${task.id} failed due to an inconsistency.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    console.log(`[process-seeding-tasks] Found post ID: ${post.id} to process.`);

    // 4. "Claim" the post and update task status to running
    await supabaseAdmin.from('seeding_tasks').update({ status: 'running', current_post_id: post.id, updated_at: new Date().toISOString() }).eq('id', task.id);
    
    const { data: currentTaskStatus } = await supabaseAdmin.from('seeding_tasks').select('status').eq('id', task.id).single();
    if (currentTaskStatus.status === 'cancelled') {
        console.log(`[process-seeding-tasks] Task ${task.id} was cancelled. Aborting.`);
        await supabaseAdmin.from('seeding_tasks').update({ current_post_id: null, updated_at: new Date().toISOString() }).eq('id', task.id);
        return new Response(JSON.stringify({ message: `Task ${task.id} was cancelled.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. Process the post
    const logPayload: any = { post_id: post.id, type: post.type };
    console.log(`[process-seeding-tasks] Starting processing for post ${post.id} of type ${post.type}.`);
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
      
      console.log(`[process-seeding-tasks] Successfully processed post ${post.id}.`);
      logPayload.status = 'success';
      await supabaseAdmin.from('logs_check_seeding_cmt_tu_dong').insert(logPayload);

    } catch (postProcessingError) {
      console.error(`[process-seeding-tasks] Error processing post ${post.id}:`, postProcessingError.message);
      logPayload.status = 'error';
      logPayload.error_message = postProcessingError.message;
      await supabaseAdmin.from('logs_check_seeding_cmt_tu_dong').insert(logPayload);
    }

    // 6. Update progress and release the "claim"
    const newProgress = task.progress_current + 1;
    const isCompleted = newProgress >= task.progress_total;
    console.log(`[process-seeding-tasks] Task ${task.id} progress: ${newProgress}/${task.progress_total}. Completed: ${isCompleted}`);
    
    const updateData = {
      progress_current: newProgress,
      current_post_id: null,
      updated_at: new Date().toISOString(),
      status: isCompleted ? 'completed' : 'running'
    };
    await supabaseAdmin.from('seeding_tasks').update(updateData).eq('id', task.id);

    // 7. If the task is not yet complete, trigger the next run immediately.
    if (!isCompleted) {
      console.log(`[process-seeding-tasks] Task ${task.id} not complete. Self-invoking for next post.`);
      supabaseAdmin.functions.invoke('process-seeding-tasks', {}).catch(err => {
        console.error(`[process-seeding-tasks] Error self-invoking for task ${task.id}:`, err);
      });
    }

    return new Response(JSON.stringify({ message: `Task ${task.id} processed post ${post.id}.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error(`[process-seeding-tasks] CRITICAL ERROR for task ID ${task?.id}:`, error.message);
    if (task && task.id) {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'failed', error_message: error.message }).eq('id', task.id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})