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
    const { projectId, posts } = await req.json();
    if (!projectId) throw new Error("Project ID is required.");
    if (!posts || !Array.isArray(posts)) throw new Error("Posts array is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (posts.length > 0) {
      // Filter out posts where AI check result is 'Có'
      const resultsToInsert = posts
        .filter(p => p.ai_check_result !== 'Có')
        .map(p => ({
          project_id: projectId,
          post_content: p.post_content,
          post_link: p.post_link,
          post_author_name: p.post_author_name,
          post_author_id: p.post_author_id,
          group_id: p.group_id,
          found_keywords: p.found_keywords,
          ai_check_result: p.ai_check_result,
          ai_check_details: p.ai_check_details,
        }));

      if (resultsToInsert.length > 0) {
        await supabaseAdmin.from('post_scan_results').insert(resultsToInsert);
      }
    }

    await supabaseAdmin.from('post_scan_projects').update({ last_scanned_at: new Date().toISOString() }).eq('id', projectId);

    const { data: allProjectResults } = await supabaseAdmin.from('post_scan_results').select('*').eq('project_id', projectId).order('scanned_at', { ascending: false });
    
    return new Response(JSON.stringify(allProjectResults || []), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})