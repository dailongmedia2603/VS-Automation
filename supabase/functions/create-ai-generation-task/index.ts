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

    // Fire-and-forget invocation of the processor. We don't wait for it.
    // This makes the initial request fast and avoids timeouts.
    supabaseAdmin.functions.invoke('process-ai-generation-tasks').catch(console.error);

    return new Response(JSON.stringify(newTask), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created: Indicates a resource was created.
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})