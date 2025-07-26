// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- multi-ai-proxy function started ---");
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, model, input, apiUrl, apiKey, embeddingModelName } = await req.json();
    console.log("Request body parsed:", { hasMessages: !!messages, hasInput: !!input, apiUrl, hasApiKey: !!apiKey, embeddingModelName });

    if (!apiKey) throw new Error('Missing "apiKey" in request body. Please provide it in the Settings page.');
    if (!apiUrl) throw new Error('Missing "apiUrl" in request body.');

    let upstreamUrl;
    let upstreamBody;

    // Check if it's an embedding request
    if (input) {
        console.log("Handling embedding request.");
        const v1Index = apiUrl.lastIndexOf('/v1/');
        // Correctly form the base URL, avoiding double slashes
        const baseUrl = (v1Index !== -1 ? apiUrl.substring(0, v1Index + 3) : apiUrl).replace(/\/$/, '');
        upstreamUrl = `${baseUrl}/embeddings`;
        
        const body: { input: string; model?: string } = { input };
        if (embeddingModelName) {
            body.model = embeddingModelName;
        }
        upstreamBody = JSON.stringify(body);
    } 
    // Assume it's a chat completion request
    else if (messages) {
        console.log("Handling chat completion request.");
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

    console.log(`Sending upstream request to: ${upstreamUrl}`);

    const upstreamResponse = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: upstreamBody,
    });

    console.log(`Upstream response status: ${upstreamResponse.status}`);
    const responseText = await upstreamResponse.text();
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse upstream response as JSON:", responseText);
        if (!upstreamResponse.ok) {
             throw new Error(`API request failed with status ${upstreamResponse.status}: ${responseText}`);
        }
        throw new Error("Received a successful but non-JSON response from the API.");
    }

    if (!upstreamResponse.ok) {
        const errorMessage = data?.error?.message || `API request failed with status ${upstreamResponse.status}`;
        console.error("Upstream API error:", errorMessage);
        throw new Error(errorMessage);
    }

    console.log("--- multi-ai-proxy function finished successfully ---");
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`--- multi-ai-proxy function error: ${error.message} ---`);
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})