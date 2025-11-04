// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
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
  
  const pemContents = privateKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '');

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
    const { projectId, posts } = await req.json();
    if (!projectId) throw new Error("Project ID is required.");
    if (!posts || !Array.isArray(posts)) throw new Error("Posts array is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: project, error: projectError } = await supabaseAdmin
      .from('post_scan_projects')
      .select('post_scan_ai_prompt')
      .eq('id', projectId)
      .single();
    if (projectError) throw projectError;

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('gemini_scan_model').eq('id', 1).single();
    if (settingsError) throw new Error("Chưa cấu hình AI model.");

    const credentialsJson = Deno.env.get("GOOGLE_CREDENTIALS_JSON");
    if (!credentialsJson || !project.post_scan_ai_prompt) {
      return new Response(JSON.stringify({ posts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const credentials = JSON.parse(credentialsJson);
    const cloudProjectId = credentials.project_id;
    const region = "us-central1";
    const accessToken = await getGcpAccessToken(credentialsJson);

    const postsWithAiResults = [];
    for (const post of posts) {
      const geminiPrompt = `${project.post_scan_ai_prompt}\n\nNội dung bài viết:\n${post.post_content}`;
      const modelToUse = aiSettings.gemini_scan_model || 'gemini-2.5-flash';
      let geminiData = null;
      let aiResult = null;
      let aiDetails = null;

      try {
        const maxRetries = 3;
        const retryDelay = 1000;
        let attempt = 0;

        while (attempt < maxRetries) {
          attempt++;
          const vertexAiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${cloudProjectId}/locations/${region}/publishers/google/models/${modelToUse}:generateContent`;
          const geminiRes = await fetch(vertexAiUrl, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: geminiPrompt }] }] }),
          });
          
          geminiData = await geminiRes.json();

          if (!geminiRes.ok) {
            if (geminiRes.status >= 500 && attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            throw new Error(geminiData?.error?.message || `Lỗi API với mã trạng thái ${geminiRes.status}`);
          }

          const hasContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (hasContent) {
            aiResult = hasContent.trim();
            break;
          }

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            throw new Error("AI từ chối tạo nội dung (có thể do bộ lọc an toàn).");
          }
        }
      } catch (e) {
        aiResult = `Lỗi: ${e.message}`;
        geminiData = { error: e.message };
      }
      
      aiDetails = { prompt: geminiPrompt, response: geminiData };

      postsWithAiResults.push({
        ...post,
        ai_check_result: aiResult,
        ai_check_details: aiDetails,
      });
    }

    return new Response(JSON.stringify({ posts: postsWithAiResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})