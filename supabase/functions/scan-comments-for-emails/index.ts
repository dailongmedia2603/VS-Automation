// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json();
    if (!projectId) throw new Error("Project ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('email_scan_projects')
      .select('fb_post_id')
      .eq('id', projectId)
      .single();
    if (projectError || !project) throw new Error("Project not found.");
    if (!project.fb_post_id) throw new Error("Facebook Post ID is not configured for this project.");

    // 2. Get comments from Facebook
    const { data: commentsData, error: commentsError } = await supabaseAdmin.functions.invoke('get-fb-comments', {
      body: { fbPostId: project.fb_post_id }
    });
    if (commentsError || commentsData.error) throw new Error(commentsError?.message || commentsData.error);
    
    const rawResponse = JSON.parse(commentsData.rawResponse);
    const allComments = [];
    let topLevelComments = [];
    if (rawResponse && rawResponse.data && Array.isArray(rawResponse.data.data)) {
        topLevelComments = rawResponse.data.data;
    } else if (rawResponse && Array.isArray(rawResponse.data)) {
        topLevelComments = rawResponse.data;
    } else if (Array.isArray(rawResponse)) {
        topLevelComments = rawResponse;
    }

    for (const comment of topLevelComments) {
        allComments.push(comment);
        if (comment.comments && Array.isArray(comment.comments.data)) {
            allComments.push(...comment.comments.data);
        }
    }

    // 3. Extract emails
    const foundEmails = [];
    for (const comment of allComments) {
      if (comment.message) {
        const emailsInComment = comment.message.match(EMAIL_REGEX);
        if (emailsInComment) {
          emailsInComment.forEach(email => {
            foundEmails.push({
              project_id: projectId,
              email: email.toLowerCase(),
              comment_content: comment.message,
              account_name: comment.from?.name,
              account_id: comment.from?.id,
              comment_link: comment.permalink_url,
            });
          });
        }
      }
    }

    // 4. Store results
    // Clear old results first
    await supabaseAdmin.from('email_scan_results').delete().eq('project_id', projectId);

    if (foundEmails.length > 0) {
      // Remove duplicate emails before inserting
      const uniqueEmails = Array.from(new Map(foundEmails.map(item => [item['email'], item])).values());
      const { error: insertError } = await supabaseAdmin.from('email_scan_results').insert(uniqueEmails);
      if (insertError) throw insertError;
    }

    // 5. Update project's last_scanned_at
    await supabaseAdmin.from('email_scan_projects').update({ last_scanned_at: new Date().toISOString() }).eq('id', projectId);

    return new Response(JSON.stringify({ success: true, count: foundEmails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in scan-comments-for-emails function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})