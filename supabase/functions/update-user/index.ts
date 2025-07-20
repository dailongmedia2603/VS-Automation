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
    const { userId, name, avatar_url, role, status } = await req.json();
    if (!userId) throw new Error("User ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Update user metadata in auth.users
    const authUpdateData = {
      data: {
        full_name: name,
        avatar_url: avatar_url
      }
    };
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdateData);
    if (authError) throw authError;

    // Step 2: Upsert role and status in public.staff
    // Upsert will create a new record if one doesn't exist, or update it if it does.
    const staffUpsertData = {
        id: userId,
        role: role,
        status: status,
    };
    const { error: staffError } = await supabaseAdmin
        .from('staff')
        .upsert(staffUpsertData);
        
    if (staffError) throw staffError;

    return new Response(JSON.stringify(user), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error updating user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})