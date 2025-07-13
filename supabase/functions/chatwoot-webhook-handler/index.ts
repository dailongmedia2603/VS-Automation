// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

console.log("Function chatwoot-webhook-handler is active and listening.");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chatwoot-hmac-sha256',
}

serve(async (req) => {
  // Log ngay khi nhận được request
  console.log("--- REQUEST RECEIVED ---");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers));

  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request.");
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.text();
    console.log("Request Body:", body);
    
    // Gửi phản hồi thành công
    return new Response(
      JSON.stringify({ status: 'ok', message: 'Webhook received and logged successfully by the new listener.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in simple webhook handler:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})