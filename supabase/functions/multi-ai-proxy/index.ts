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
    const { messages, model, input, apiUrl, apiKey, embeddingModelName } = await req.json();

    if (!apiKey) throw new Error('Missing "apiKey" in request body. Please provide it in the Settings page.');
    if (!apiUrl) throw new Error('Missing "apiUrl" in request body.');

    let upstreamUrl;
    let upstreamBody;

    // Check if it's an embedding request by looking for the 'input' key
    if (input) {
        const v1Index = apiUrl.lastIndexOf('/v1/');
        const baseUrl = v1Index !== -1 ? apiUrl.substring(0, v1Index + 3) : apiUrl.replace(/\/$/, '');
        upstreamUrl = `${baseUrl}/embeddings`;
        
        const body: { input: string; model?: string } = {
            input: input,
        };

        if (embeddingModelName) {
            body.model = embeddingModelName;
        }
        
        upstreamBody = JSON.stringify(body);
    } 
    // Otherwise, assume it's a chat completion request
    else if (messages) {
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('Invalid "messages" in request body.');
        }
        upstreamUrl = apiUrl;
        upstreamBody = JSON.stringify({
            model: model || 'gpt-4o',
            messages: messages,
            max_tokens: 2048,
            stream: false,
        });
    } else {
        throw new Error('Request body must contain either "messages" for chat or "input" for embedding.');
    }

    const upstreamResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: upstreamBody,
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