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

    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { count, error: countError } = await supabaseAdmin
      .from('seeding_posts')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'checking');

    if (countError) throw countError;
    if (count === 0) {
      return new Response(JSON.stringify({ message: "Không có bài viết nào cần quét." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: newTask, error: insertError } = await supabaseAdmin
      .from('seeding_tasks')
      .insert({
        project_id: projectId,
        creator_id: user.id,
        status: 'pending',
        progress_total: count,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})