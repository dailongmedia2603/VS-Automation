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

    // Step 1: Count ONLY the posts that are currently in 'checking' state.
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

    // Step 2: Create the new task with the correct count.
    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('seeding_tasks')
      .insert({
        project_id: projectId,
        status: 'pending',
        progress_total: count,
        progress_current: 0,
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