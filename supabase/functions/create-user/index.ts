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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { email, password, name, avatar_url } = await req.json();
    if (!email || !password || !name) {
      throw new Error("Email, password, and name are required.");
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        avatar_url: avatar_url || `https://i.pravatar.cc/150?u=${email}`
      }
    });

    if (authError) throw authError;
    if (!user) throw new Error("User creation failed, no user returned.");

    // Create a corresponding entry in the public.staff table
    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        id: user.id,
        status: 'active'
      });

    if (staffError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw staffError;
    }

    // Assign the default 'Member' role
    const { data: memberRole, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', 'Member')
        .single();
    
    if (roleError) {
        console.error("Default 'Member' role not found. New user will not have a role assigned.");
    } else {
        const { error: userRoleError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: user.id, role_id: memberRole.id });
        
        if (userRoleError) {
            console.error(`Failed to assign default role to user ${user.id}:`, userRoleError.message);
        }
    }

    return new Response(JSON.stringify(user), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating user:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})