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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const functionsToTrigger = [
      'trigger-scheduled-checks',
      'trigger-post-scan-checks'
    ];

    console.log(`Orchestrator invoked. Triggering: ${functionsToTrigger.join(', ')}`);

    const promises = functionsToTrigger.map(funcName => 
      supabaseAdmin.functions.invoke(funcName)
    );

    const results = await Promise.allSettled(promises);

    const report = results.map((result, index) => {
      const funcName = functionsToTrigger[index];
      if (result.status === 'fulfilled') {
        console.log(`Successfully triggered ${funcName}.`);
        return { function: funcName, status: 'success', data: result.value.data };
      } else {
        console.error(`Failed to trigger ${funcName}:`, result.reason.message);
        return { function: funcName, status: 'error', reason: result.reason.message };
      }
    });

    return new Response(JSON.stringify({ message: "Hourly tasks triggered.", report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in trigger-hourly-tasks orchestrator:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})