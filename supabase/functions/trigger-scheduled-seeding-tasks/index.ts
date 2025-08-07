// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const parseFrequency = (value, unit) => {
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return null;

  switch (unit) {
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

  console.log(`[trigger-scheduled-seeding-tasks] Function started at ${new Date().toISOString()}`);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: schedules, error: fetchError } = await supabaseAdmin
      .from('seeding_project_schedules')
      .select('*')
      .eq('is_active', true);

    if (fetchError) throw new Error(`Failed to fetch schedules: ${fetchError.message}`);
    
    console.log(`[trigger-scheduled-seeding-tasks] Found ${schedules.length} active schedules.`);

    const now = new Date();
    const schedulesToRun = [];

    for (const schedule of schedules) {
      console.log(`[trigger-scheduled-seeding-tasks] Checking project ID: ${schedule.project_id}`);
      const interval = parseFrequency(schedule.frequency_value, schedule.frequency_unit);
      if (!interval) {
        console.log(`  - Project schedule ${schedule.id} has invalid frequency: ${schedule.frequency_unit}. Skipping.`);
        continue;
      }

      const lastTriggered = schedule.last_triggered_at ? new Date(schedule.last_triggered_at) : null;
      const timeSinceLastTrigger = lastTriggered ? now.getTime() - lastTriggered.getTime() : Infinity;

      console.log(`  - Interval: ${interval}ms`);
      console.log(`  - Last triggered: ${lastTriggered ? lastTriggered.toISOString() : 'Never'}`);
      console.log(`  - Time since last trigger: ${timeSinceLastTrigger}ms`);
      console.log(`  - Condition to run: ${!lastTriggered || timeSinceLastTrigger >= interval}`);

      if (!lastTriggered || timeSinceLastTrigger >= interval) {
        console.log(`  - Project ${schedule.project_id} is DUE for scanning. Adding to queue.`);
        schedulesToRun.push(schedule);
      } else {
        console.log(`  - Project ${schedule.project_id} is NOT YET due for scanning. Skipping.`);
      }
    }

    if (schedulesToRun.length === 0) {
      console.log("[trigger-scheduled-seeding-tasks] No projects are due for scanning at this time.");
      return new Response(JSON.stringify({ message: "No schedules are due." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[trigger-scheduled-seeding-tasks] Triggering tasks for ${schedulesToRun.length} projects: [${schedulesToRun.map(p => p.project_id).join(', ')}]`);

    const runPromises = schedulesToRun.map(async (schedule) => {
      try {
        console.log(`  - Invoking create-seeding-task for project ${schedule.project_id}...`);
        await supabaseAdmin.functions.invoke('create-seeding-task', {
          body: { projectId: schedule.project_id }
        });
        console.log(`  - Invoked create-seeding-task successfully for project ${schedule.project_id}.`);
        
        await supabaseAdmin
          .from('seeding_project_schedules')
          .update({ 
            last_triggered_at: new Date().toISOString(),
            run_count: (schedule.run_count || 0) + 1
          })
          .eq('id', schedule.id);
        
        return { projectId: schedule.project_id, status: 'success' };
      } catch (error) {
        console.error(`Failed to trigger task for project ${schedule.project_id}:`, error.message);
        return { projectId: schedule.project_id, status: 'error', message: error.message };
      }
    });

    const results = await Promise.all(runPromises);

    return new Response(JSON.stringify({ message: "Scheduled tasks triggered.", results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[trigger-scheduled-seeding-tasks] CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})