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
    if (!projectId) throw new Error("Project ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
      if (user) userId = user.id;
    }

    // Step 1: Reset the status of all posts in the project to 'checking'
    // This ensures that "Check All" re-checks everything.
    console.log(`[create-seeding-task] Resetting posts for project ${projectId}...`);
    const { error: updateError } = await supabaseAdmin
      .from('seeding_posts')
      .update({ status: 'checking' })
      .eq('project_id', projectId);

    if (updateError) {
      console.error(`[create-seeding-task] Error resetting posts:`, updateError);
      throw new Error(`Failed to reset posts for checking: ${updateError.message}`);
    }
    console.log(`[create-seeding-task] Posts reset successfully.`);

    // Step 2: Count the posts that are now ready for checking.
    const { count, error: countError } = await supabaseAdmin
      .from('seeding_posts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'checking');

    if (countError) throw countError;
    
    console.log(`[create-seeding-task] Found ${count} posts to check.`);

    if (count === 0) {
      return new Response(JSON.stringify({ message: "Không có bài viết nào cần quét." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Step 3: Create the new task.
    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('seeding_tasks')
      .insert({
        project_id: projectId,
        creator_id: userId,
        status: 'pending',
        progress_total: count,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    
    console.log(`[create-seeding-task] Created new task with ID: ${newTask.id}`);

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    console.error(`[create-seeding-task] CRITICAL ERROR:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})