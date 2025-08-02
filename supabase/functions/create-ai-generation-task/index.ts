// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { itemId, config } = await req.json();
    if (!itemId || !config) {
      throw new Error("Thiếu ID mục hoặc cấu hình.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Không thể xác thực người dùng.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: existingTask, error: existingTaskError } = await supabaseAdmin
      .from('ai_generation_tasks')
      .select('id, status')
      .eq('item_id', itemId)
      .in('status', ['pending', 'running'])
      .maybeSingle();

    if (existingTaskError) throw existingTaskError;
    if (existingTask) {
      throw new Error(`Đã có một tác vụ đang chạy cho mục này (Trạng thái: ${existingTask.status}). Vui lòng chờ hoàn tất.`);
    }

    // Fetch the selected structure and add it to the config
    if (config.structureId) {
      const { data: structure, error: structError } = await supabaseAdmin
        .from('article_structures')
        .select('*')
        .eq('id', config.structureId)
        .single();
      if (structError) throw new Error("Không tìm thấy cấu trúc bài viết đã chọn.");
      config.structure = structure; // Attach the full structure object
    }

    const { data: newTask, error: insertError } = await supabase
      .from('ai_generation_tasks')
      .insert({
        item_id: itemId,
        creator_id: user.id,
        config: config,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Invoke and wait for the processor to finish
    const { error: processError } = await supabaseAdmin.functions.invoke('process-ai-generation-tasks');
    if (processError) {
        // Try to get a more specific error message from the context
        let detailedError = processError.message;
        try {
            const context = await processError.context.json();
            if (context.error) detailedError = context.error;
        } catch(e) { /* ignore json parsing error */ }
        throw new Error(detailedError);
    }

    // Fetch the updated item to return to the client
    const { data: updatedItem, error: fetchError } = await supabaseAdmin
        .from('content_ai_items')
        .select('*')
        .eq('id', itemId)
        .single();
    
    if (fetchError) throw fetchError;

    return new Response(JSON.stringify(updatedItem), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 instead of 201 as we are returning the final resource
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})