// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to convert interval string to milliseconds
const intervalToMs = (frequency) => {
  if (!frequency) return 0;
  const [value, unit] = frequency.split('_');
  const numValue = parseInt(value, 10);
  if (isNaN(numValue)) return 0;

  switch (unit) {
    case 'minutes': return numValue * 60 * 1000;
    case 'hours': return numValue * 60 * 60 * 1000;
    case 'days': return numValue * 24 * 60 * 60 * 1000;
    default: return 0;
  }
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

    // 1. Get all active posts for comment checking
    const { data: activePosts, error: postsError } = await supabaseAdmin
      .from('seeding_posts')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'comment_check');

    if (postsError) throw postsError;

    const now = new Date();
    const postsToRun = activePosts.filter(post => {
      if (!post.check_frequency) return false;
      const intervalMs = intervalToMs(post.check_frequency);
      if (intervalMs === 0) return false;
      const lastChecked = post.last_checked_at ? new Date(post.last_checked_at) : new Date(0);
      return now.getTime() - lastChecked.getTime() >= intervalMs;
    });

    if (postsToRun.length === 0) {
      return new Response(JSON.stringify({ message: "No posts to check at this time." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Run checks for each post
    for (const post of postsToRun) {
      try {
        const { data: fbData, error: functionError } = await supabaseAdmin.functions.invoke('get-fb-comments', {
          body: { postId: post.links }
        });

        if (functionError) throw functionError;
        if (fbData.error) throw new Error(fbData.error);

        const actualComments = fbData.data || [];
        
        const { data: expectedComments, error: dbCommentsError } = await supabaseAdmin
          .from('seeding_comments')
          .select('id, content, status')
          .eq('post_id', post.id);
        
        if (dbCommentsError) throw dbCommentsError;
        if (!expectedComments || expectedComments.length === 0) continue;

        const updates = [];
        let foundCount = 0;

        for (const expectedComment of expectedComments) {
          const foundFbComment = actualComments.find(actual => actual.message && actual.message.trim() === expectedComment.content.trim());
          if (foundFbComment) {
            foundCount++;
            if (expectedComment.status !== 'visible') {
              updates.push({
                id: expectedComment.id,
                status: 'visible',
                account_name: foundFbComment.from?.name || 'Không rõ',
                comment_link: foundFbComment.permalink_url || null,
              });
            }
          } else {
            if (expectedComment.status === 'visible') {
              updates.push({ id: expectedComment.id, status: 'not_visible', account_name: null, comment_link: null });
            }
          }
        }

        if (updates.length > 0) {
          await supabaseAdmin.from('seeding_comments').upsert(updates);
        }

        const allVisible = (foundCount + expectedComments.filter(c => c.status === 'visible' && !updates.find(u => u.id === c.id)).length) === expectedComments.length;

        if (allVisible) {
          await supabaseAdmin.from('seeding_posts').update({ status: 'completed', is_active: false, last_checked_at: new Date().toISOString() }).eq('id', post.id);
        } else {
          await supabaseAdmin.from('seeding_posts').update({ last_checked_at: new Date().toISOString() }).eq('id', post.id);
        }
      } catch (e) {
        console.error(`Failed to check post ${post.id}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ message: `Checked ${postsToRun.length} posts.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in run-periodic-checks:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})