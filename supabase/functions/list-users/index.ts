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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw usersError;

    const { data: staffData, error: staffError } = await supabaseAdmin.from('staff').select('id, status');
    if (staffError) throw staffError;

    const { data: userRolesData, error: userRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, roles(name)');
    if (userRolesError) throw userRolesError;

    const staffMap = new Map(staffData.map(s => [s.id, s]));
    
    const userRolesMap = new Map();
    userRolesData.forEach(ur => {
      const roles = ur.roles;
      const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name;
      if (roleName) {
        userRolesMap.set(ur.user_id, roleName);
      }
    });

    const combinedUsers = users.map(user => {
      const staffInfo = staffMap.get(user.id) || {};
      const roleName = userRolesMap.get(user.id) || 'Chưa có vai trò';
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        role: roleName,
        status: staffInfo.status || 'active',
      };
    });

    return new Response(JSON.stringify(combinedUsers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error listing users:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})