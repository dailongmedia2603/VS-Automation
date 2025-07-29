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
    // 1. Find a running or pending task
    let { data: task, error: findError } = await supabaseAdmin
      .from('seeding_tasks')
      .select('*')
      .eq('status', 'running')
      .limit(1)
      .single();

    if (!task) {
      ({ data: task, error: findError } = await supabaseAdmin
        .from('seeding_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single());
    }

    if (findError || !task) {
      return new Response(JSON.stringify({ message: "No tasks to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. If task was pending, set to running
    if (task.status === 'pending') {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', task.id);
    }

    // 3. Find ONE unprocessed post for this task, prioritizing those not recently checked
    const { data: post, error: postError } = await supabaseAdmin
      .from('seeding_posts')
      .select('id, links, type')
      .eq('project_id', task.project_id)
      .eq('status', 'checking')
      .order('last_checked_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single();

    if (!post) {
      // No more posts to check, mark task as completed
      await supabaseAdmin.from('seeding_tasks').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', task.id);
      return new Response(JSON.stringify({ message: `Task ${task.id} completed. No more posts to process.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Process this single post
    try {
      // Immediately update last_checked_at to "claim" this post for this run,
      // ensuring it goes to the back of the queue for the next worker run.
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
    } catch (postError) {
      console.error(`Error processing post ${post.id}:`, postError.message);
      // Even if a post fails, we increment the progress to avoid getting stuck
    }

    // 5. Update progress
    const newProgress = task.progress_current + 1;
    const updateData = {
      progress_current: newProgress,
      updated_at: new Date().toISOString(),
      status: newProgress >= task.progress_total ? 'completed' : 'running'
    };
    await supabaseAdmin.from('seeding_tasks').update(updateData).eq('id', task.id);

    return new Response(JSON.stringify({ message: `Task ${task.id} processed post ${post.id}. Progress: ${newProgress}/${task.progress_total}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const { data: runningTask } = await supabaseAdmin.from('seeding_tasks').select('id').eq('status', 'running').limit(1).single();
    if (runningTask) {
      await supabaseAdmin.from('seeding_tasks').update({ status: 'failed', error_message: error.message }).eq('id', runningTask.id);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})