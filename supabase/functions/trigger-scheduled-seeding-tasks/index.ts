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
      const interval = parseFrequency(schedule.frequency_value, schedule.frequency_unit);
      if (!interval) continue;

      const lastTriggered = schedule.last_triggered_at ? new Date(schedule.last_triggered_at) : null;
      const timeSinceLastTrigger = lastTriggered ? now.getTime() - lastTriggered.getTime() : Infinity;

      if (!lastTriggered || timeSinceLastTrigger >= interval) {
        schedulesToRun.push(schedule);
      }
    }

    if (schedulesToRun.length === 0) {
      return new Response(JSON.stringify({ message: "No schedules are due." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[trigger-scheduled-seeding-tasks] Triggering tasks for ${schedulesToRun.length} projects.`);

    const runPromises = schedulesToRun.map(async (schedule) => {
      try {
        // Invoke create-seeding-task, which creates the task for the worker to pick up
        await supabaseAdmin.functions.invoke('create-seeding-task', {
          body: { projectId: schedule.project_id }
        });
        
        // Update last_triggered_at to prevent re-triggering
        await supabaseAdmin
          .from('seeding_project_schedules')
          .update({ last_triggered_at: new Date().toISOString() })
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
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})