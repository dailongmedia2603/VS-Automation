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

    const { data: projects, error: fetchError } = await supabaseAdmin
      .from('post_scan_projects')
      .select('id, scan_frequency, last_scanned_at, is_ai_check_active')
      .eq('is_active', true);

    if (fetchError) throw new Error(`Failed to fetch projects: ${fetchError.message}`);

    const now = new Date();
    const projectsToScan = [];

    for (const project of projects) {
      const interval = parseFrequency(project.scan_frequency);
      if (!interval) continue;

      const lastScanned = project.last_scanned_at ? new Date(project.last_scanned_at) : null;

      if (!lastScanned || (now.getTime() - lastScanned.getTime()) >= interval) {
        projectsToScan.push(project);
      }
    }

    if (projectsToScan.length === 0) {
      return new Response(JSON.stringify({ message: "No projects due for scanning." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const scanPromises = projectsToScan.map(async (project) => {
      try {
        const sinceDate = project.last_scanned_at ? new Date(project.last_scanned_at) : new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to last 24h
        const untilDate = now;
        const timeCheckString = `&since=${sinceDate.toISOString()}&until=${untilDate.toISOString()}`;

        const { data: scanData, error: scanError } = await supabaseAdmin.functions.invoke('scan-and-filter-posts', {
          body: { projectId: project.id, timeCheckString }
        });
        if (scanError || scanData.error) throw new Error(scanError?.message || scanData?.error);
        
        let finalPosts = scanData.posts;
        if (project.is_ai_check_active && finalPosts.length > 0) {
          const { data: aiData, error: aiError } = await supabaseAdmin.functions.invoke('check-posts-with-ai', {
            body: { projectId: project.id, posts: finalPosts }
          });
          if (aiError || aiData.error) throw new Error(aiError?.message || aiData?.error);
          finalPosts = aiData.posts;
        }

        await supabaseAdmin.functions.invoke('store-scan-results', {
          body: { projectId: project.id, posts: finalPosts }
        });
        
        return { id: project.id, status: 'success' };
      } catch (error) {
        console.error(`Failed to scan project ID ${project.id}:`, error.message);
        return { id: project.id, status: 'error', message: error.message };
      }
    });

    const results = await Promise.all(scanPromises);

    return new Response(JSON.stringify({ message: "Scheduled scans triggered.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in trigger-post-scan-checks function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})