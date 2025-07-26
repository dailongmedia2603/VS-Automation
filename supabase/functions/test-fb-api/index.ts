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
    const { apiUrl, accessToken } = await req.json();
    if (!accessToken) {
      throw new Error("Access Token is required.");
    }

    const finalApiUrl = apiUrl || 'https://graph.facebook.com/v20.0';
    const testUrl = `${finalApiUrl}/me?access_token=${accessToken}`;

    const response = await fetch(testUrl);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return new Response(JSON.stringify({ success: true, message: "Connection successful!", data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing Facebook API connection:', error.message);
    // Return 200 OK but with an error payload so the client can parse it.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})