// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { bot_token } = await req.json();
    if (!bot_token) {
      throw new Error("Bot token is required.");
    }

    const testUrl = `https://api.telegram.org/bot${bot_token}/getMe`;

    const response = await fetch(testUrl);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.description || `Request failed with status ${response.status}.`);
    }

    return new Response(JSON.stringify({ success: true, message: `Connection successful! Bot name: ${data.result.first_name}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Telegram API connection:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})