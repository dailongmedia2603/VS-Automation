// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeString = (str) => {
  if (!str) return '';
  return str.normalize('NFC').toLowerCase().replace(/[\s\p{P}]/gu, '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { postId } = await req.json();
  if (!postId) {
    return new Response(JSON.stringify({ error: "ID bài viết là bắt buộc." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    // Step 1: Fetch expected comments (from seeding_comments)
    const { data: expectedCommentsData, error: expectedError } = await supabaseAdmin
      .from('seeding_comments')
      .select('*')
      .eq('post_id', postId);
    if (expectedError) throw new Error(`Lỗi lấy comment dự kiến: ${expectedError.message}`);
    const expectedComments = expectedCommentsData || [];

    // Step 2: Fetch actual comments (from actual_comments)
    const { data: actualCommentsData, error: actualError } = await supabaseAdmin
      .from('actual_comments')
      .select('*')
      .eq('post_id', postId);
    if (actualError) throw new Error(`Lỗi lấy comment thực tế: ${actualError.message}`);
    const actualComments = actualCommentsData || [];

    // Step 3: Perform comparison
    const updates = [];
    let foundCount = 0;

    const normalizedApiComments = actualComments.map(c => ({
        ...c,
        normalizedMessage: normalizeString(c.message)
    }));

    for (const expectedComment of expectedComments) {
      const normalizedExpectedContent = normalizeString(expectedComment.content);
      
      const foundFbComment = normalizedApiComments.find(actual => 
        actual.normalizedMessage && actual.normalizedMessage.includes(normalizedExpectedContent)
      );
      
      if (foundFbComment) {
        foundCount++;
        updates.push({
          id: expectedComment.id,
          status: 'visible',
          account_name: foundFbComment.account_name,
          comment_link: foundFbComment.comment_link,
          account_id: foundFbComment.account_id,
        });
      } else {
        if (expectedComment.status === 'visible') {
          updates.push({
            id: expectedComment.id,
            status: 'not_visible',
            account_name: null,
            comment_link: null,
            account_id: null,
          });
        }
      }
    }

    // Step 4: Batch update using individual UPDATE statements in parallel
    if (updates.length > 0) {
      const updatePromises = updates.map(updateData => {
        const { id, ...dataToUpdate } = updateData;
        return supabaseAdmin
          .from('seeding_comments')
          .update(dataToUpdate)
          .eq('id', id);
      });

      const results = await Promise.all(updatePromises);
      const firstError = results.find(res => res.error);
      if (firstError) {
        throw new Error(`Lỗi cập nhật trạng thái: ${firstError.error.message}`);
      }
    }

    const total = expectedComments.length;
    const result = { found: foundCount, notFound: total - foundCount, total };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in compare-and-update function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})