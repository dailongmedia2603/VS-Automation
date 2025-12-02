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
    const { apiUrl, token } = await req.json();
    if (!apiUrl || !token) {
      throw new Error("API URL and Token are required.");
    }

    const url = new URL(apiUrl);
    url.searchParams.append('token', token);

    const formData = new FormData();
    formData.append('prompt', 'Trịnh Trần Phương Tuấn là ai?');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formData,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }
    
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        data = responseText;
    }

    return new Response(JSON.stringify({ success: true, message: "Connection successful!", data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing custom Gemini API:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})