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
    const { config_id, message } = await req.json();
    if (!config_id || !message) {
      throw new Error("Config ID and message are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: config, error } = await supabaseAdmin
      .from('telegram_configs')
      .select('bot_token, chat_id')
      .eq('id', config_id)
      .single();

    if (error || !config) {
      // Silently fail if config not found, as it might not be a critical error
      console.warn(`Telegram configuration not found for ID: ${config_id}`);
      return new Response(JSON.stringify({ success: true, message: "Notification skipped: config not found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { bot_token, chat_id } = config;
    const url = `https://api.telegram.org/bot${bot_token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.ok) {
      throw new Error(responseData.description || `Telegram API request failed with status ${response.status}.`);
    }

    return new Response(JSON.stringify({ success: true, message: "Notification sent." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-telegram-notification function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})