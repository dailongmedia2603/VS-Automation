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

    console.log("Cron scheduler started. Triggering all scheduled tasks.");

    // Sử dụng Promise.allSettled để đảm bảo cả hai hàm đều được gọi,
    // ngay cả khi một trong hai gặp lỗi.
    const results = await Promise.allSettled([
      supabaseAdmin.functions.invoke('trigger-post-scan-checks'),
      supabaseAdmin.functions.invoke('process-seeding-tasks') // Kích hoạt trực tiếp worker của seeding
    ]);

    console.log("Scheduled tasks triggered. Results:", results);

    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    if (errors.length > 0) {
      console.error("One or more scheduled tasks failed:", errors);
    }

    return new Response(JSON.stringify({ message: "All scheduled tasks triggered successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in cron-scheduler function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})