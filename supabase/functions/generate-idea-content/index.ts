// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getGcpAccessToken(credentialsJson: string) {
  const credentials = JSON.parse(credentialsJson);
  const privateKeyPem = credentials.private_key;
  const clientEmail = credentials.client_email;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem.substring(pemHeader.length, privateKeyPem.length - pemFooter.length).replace(/\\n/g, '').replace(/\s/g, '');
  const binaryDer = atob(pemContents);
  const keyBuffer = new Uint8Array(binaryDer.length).map((_, i) => binaryDer.charCodeAt(i)).buffer;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    },
    privateKey
  );

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Failed to get access token: ${tokenData.error_description || 'Unknown error'}`);
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, model } = await req.json();
    if (!prompt) throw new Error("Prompt is required.");
    if (!model) throw new Error("Model is required.");

    const credentialsJson = Deno.env.get("GOOGLE_CREDENTIALS_JSON");
    if (!credentialsJson) {
      throw new Error("Secret 'GOOGLE_CREDENTIALS_JSON' not found in Supabase Vault.");
    }

    const credentials = JSON.parse(credentialsJson);
    const projectId = credentials.project_id;
    const region = "us-central1";

    const accessToken = await getGcpAccessToken(credentialsJson);

    const vertexAiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

    const vertexRes = await fetch(vertexAiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    const vertexData = await vertexRes.json();

    if (!vertexRes.ok) {
      throw new Error(vertexData?.error?.message || `Vertex AI API request failed with status ${vertexRes.status}.`);
    }

    const content = vertexData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Vertex AI returned a valid response but with no content.");
    }

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-idea-content function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})