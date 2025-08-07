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

  // Make the unit parsing more robust (handles 'minute' and 'minutes')
  const normalizedUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;

  switch (normalizedUnit) {
    case 'minute': return numValue * 60 * 1000;
    case 'hour': return numValue * 60 * 60 * 1000;
    case 'day': return numValue * 24 * 60 * 60 * 1000;
    default: return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`[trigger-post-scan-checks] Function started at ${new Date().toISOString()}`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("[trigger-post-scan-checks] Fetching active post scan projects...");
    const { data: projects, error: fetchError } = await supabaseAdmin
      .from('post_scan_projects')
      .select('id, scan_frequency, last_scanned_at, is_ai_check_active')
      .eq('is_active', true);

    if (fetchError) throw new Error(`Failed to fetch projects: ${fetchError.message}`);
    
    console.log(`[trigger-post-scan-checks] Found ${projects.length} active projects.`);

    const now = new Date();
    const projectsToScan = [];

    for (const project of projects) {
      console.log(`[trigger-post-scan-checks] Checking project ID: ${project.id}`);
      const interval = parseFrequency(project.scan_frequency);
      
      if (interval === null) {
        console.log(`  - Project ${project.id} has invalid frequency: ${project.scan_frequency}. Skipping.`);
        continue;
      }

      const lastScanned = project.last_scanned_at ? new Date(project.last_scanned_at) : null;
      const timeSinceLastScan = lastScanned ? now.getTime() - lastScanned.getTime() : Infinity;
      const isDue = !lastScanned || timeSinceLastScan >= interval;

      // Improved logging for better debugging
      console.log(`  - Last scanned: ${lastScanned ? lastScanned.toISOString() : 'Never'}`);
      console.log(`  - Interval: ${interval}ms`);
      console.log(`  - Time since last scan: ${timeSinceLastScan}ms`);
      console.log(`  - Condition check (timeSinceLastScan >= interval): ${timeSinceLastScan >= interval}`);
      console.log(`  - Is due for scanning? ${isDue}`);

      if (isDue) {
        console.log(`  - Project ${project.id} is DUE for scanning. Adding to queue.`);
        projectsToScan.push(project);
      } else {
        console.log(`  - Project ${project.id} is NOT YET due for scanning. Skipping.`);
      }
    }

    if (projectsToScan.length === 0) {
      console.log("[trigger-post-scan-checks] No projects are due for scanning at this time.");
      return new Response(JSON.stringify({ message: "No projects due for scanning." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[trigger-post-scan-checks] Triggering scans for ${projectsToScan.length} projects: [${projectsToScan.map(p => p.id).join(', ')}]`);

    const scanPromises = projectsToScan.map(async (project) => {
      try {
        const sinceDate = project.last_scanned_at ? new Date(project.last_scanned_at) : new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to last 24h
        const untilDate = now;
        const timeCheckString = `&since=${sinceDate.toISOString()}&until=${untilDate.toISOString()}`;

        const { data: scanData, error: scanError } = await supabaseAdmin.functions.invoke('scan-and-filter-posts', {
          body: { projectId: project.id, timeCheckString }
        });
        if (scanError || scanData.error) throw new Error(scanError?.message || scanData.error);
        
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
        
        console.log(`[trigger-post-scan-checks] Successfully processed project ID ${project.id}.`);
        return { id: project.id, status: 'success' };
      } catch (error) {
        console.error(`[trigger-post-scan-checks] Failed to scan project ID ${project.id}:`, error.message);
        return { id: project.id, status: 'error', message: error.message };
      }
    });

    const results = await Promise.all(scanPromises);

    return new Response(JSON.stringify({ message: "Scheduled scans triggered.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[trigger-post-scan-checks] CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})