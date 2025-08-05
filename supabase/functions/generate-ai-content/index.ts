// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ... (Toàn bộ logic xây dựng prompt từ hàm process-ai-generation-tasks cũ sẽ được chuyển vào đây) ...
// This is a simplified placeholder. The full logic will be implemented.

const formatMapping = { /* ... */ };
const buildBasePrompt = (/*...*/) => { /* ... */ };
const buildCommentPrompt = (/*...*/) => { /* ... */ };
const buildArticlePrompt = (/*...*/) => { /* ... */ };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { itemId, config } = await req.json();
    if (!itemId || !config) {
      throw new Error("Thiếu ID mục hoặc cấu hình.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing Authorization header");
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user } } = await createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '').auth.getUser(jwt);
    if (!user) throw new Error("User not authenticated.");

    // --- Start of logic moved from process-ai-generation-tasks ---
    
    const { data: item, error: itemError } = await supabaseAdmin.from('content_ai_items').select('type, content').eq('id', itemId).single();
    if (itemError) throw itemError;

    const { libraryId } = config;
    if (!libraryId) throw new Error("Config is missing libraryId.");

    const { data: aiSettings, error: settingsError } = await supabaseAdmin.from('ai_settings').select('*').eq('id', 1).single();
    if (settingsError || !aiSettings.google_gemini_api_key) throw new Error("Chưa cấu hình API Google Gemini.");

    const { data: library, error: libraryError } = await supabaseAdmin.from('prompt_libraries').select('config').eq('id', libraryId).single();
    if (libraryError || !library || !library.config) throw new Error("Không thể tải thư viện prompt hoặc thư viện chưa được cấu hình.");
    
    let documentContext = '';
    const { relatedDocumentIds } = config;

    if (relatedDocumentIds && Array.isArray(relatedDocumentIds) && relatedDocumentIds.length > 0) {
      const { data: selectedDocs, error: docsError } = await supabaseAdmin
        .from('documents')
        .select('title, content')
        .in('id', relatedDocumentIds);
      if (docsError) console.warn("Could not fetch selected documents:", docsError.message);
      else if (selectedDocs && selectedDocs.length > 0) {
        documentContext = selectedDocs.map(doc => `--- TÀI LIỆU: ${doc.title} ---\n${doc.content}`).join('\n\n');
      }
    }

    const basePrompt = buildBasePrompt(library.config, documentContext);
    
    let finalPrompt;
    if (item.type === 'article') {
      finalPrompt = buildArticlePrompt(basePrompt, config);
    } else {
      finalPrompt = buildCommentPrompt(basePrompt, config);
    }

    if (library.config.useCoT) {
      // ... CoT logic ...
    }

    const modelToUse = aiSettings.gemini_content_model || 'gemini-pro';
    const GEMINI_MAX_TOKENS = 8192;
    let maxTokens = library.config.maxTokens ?? 2048;
    if (maxTokens > GEMINI_MAX_TOKENS) maxTokens = GEMINI_MAX_TOKENS;

    const generationConfig = {
      temperature: library.config.temperature ?? 0.7,
      topP: library.config.topP ?? 0.95,
      maxOutputTokens: maxTokens,
    };

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: finalPrompt }] }],
          generationConfig: generationConfig
        }),
    });

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(geminiData?.error?.message || 'Lỗi gọi API Gemini.');
    
    geminiData.model_used = modelToUse;

    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let newContent = [];
    if (item.type === 'article') {
      newContent = rawContent.split('--- ARTICLE SEPARATOR ---').map(c => c.trim()).filter(Boolean).map(c => ({ id: crypto.randomUUID(), content: c, type: config.format || 'Bài viết' }));
    } else {
      const allConditionIds = (config.mandatoryConditions || []).map((c) => c.id);
      newContent = rawContent.split('\n').map(l => l.trim()).filter(Boolean).map(l => ({ id: crypto.randomUUID(), content: l, type: 'N/A', metConditionIds: allConditionIds }));
    }

    const existingContent = JSON.parse(item.content || '[]');
    const updatedContent = [...existingContent, ...newContent];

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('content_ai_items')
      .update({ content: JSON.stringify(updatedContent) })
      .eq('id', itemId)
      .select()
      .single();
    
    if (updateError) throw updateError;

    await supabaseAdmin.from('content_ai_logs').insert({ item_id: itemId, creator_id: user.id, prompt: finalPrompt, response: geminiData });

    // --- End of moved logic ---

    return new Response(JSON.stringify(updatedItem), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});