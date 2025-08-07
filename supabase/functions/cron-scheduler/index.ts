// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Log ngay khi function được gọi để xác nhận
  console.log(`[cron-scheduler] Invoked at ${new Date().toISOString()} with method ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("[cron-scheduler] Triggering all scheduled tasks sequentially.");

    const results = [];
    let errorOccurred = false;

    const tasksToRun = [
      'trigger-post-scan-checks',
      'trigger-scheduled-seeding-tasks',
      'process-seeding-tasks'
    ];

    for (const taskName of tasksToRun) {
      try {
        console.log(`[cron-scheduler] Invoking ${taskName}...`);
        const { data, error } = await supabaseAdmin.functions.invoke(taskName);
        results.push({ name: taskName, status: error ? 'error' : 'success', data, error });
        if (error) {
          console.error(`[cron-scheduler] Error in ${taskName}:`, error);
          errorOccurred = true;
        }
      } catch (e) {
        console.error(`[cron-scheduler] Failed to invoke ${taskName}:`, e);
        results.push({ name: taskName, status: 'invocation_failed', error: e.message });
        errorOccurred = true;
      }
    }

    console.log("[cron-scheduler] Scheduled tasks triggered. Results:", results);

    if (errorOccurred) {
      console.error("[cron-scheduler] One or more scheduled tasks failed.");
    }

    return new Response(JSON.stringify({ message: "All scheduled tasks triggered.", results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[cron-scheduler] CRITICAL ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})