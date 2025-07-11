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
    const apiKey = Deno.env.get('MULTI_APP_AI_KEY');
    if (!apiKey) {
      throw new Error('API key (MULTI_APP_AI_KEY) is not set in Supabase secrets.');
    }

    const { messages, apiUrl } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Missing or invalid "messages" in request body.');
    }
    if (!apiUrl) {
        throw new Error('Missing "apiUrl" in request body.');
    }

    const upstreamResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 2048,
            stream: false,
        }),
    });

    const responseText = await upstreamResponse.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        if (!upstreamResponse.ok) {
             throw new Error(`API request failed with status ${upstreamResponse.status}: ${responseText}`);
        }
        throw new Error("Received a successful but non-JSON response from the API.");
    }

    if (!upstreamResponse.ok) {
        const errorMessage = data?.error?.message || `API request failed with status ${upstreamResponse.status}`;
        throw new Error(errorMessage);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`Edge Function Error: ${error.message}`);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})