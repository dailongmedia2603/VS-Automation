// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json();
    if (!url || !url.startsWith('https://www.facebook.com')) {
      throw new Error("Vui lòng cung cấp một URL bài viết Facebook hợp lệ.");
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error(`Không thể truy cập URL. Facebook có thể đã chặn yêu cầu (Mã trạng thái: ${response.status})`);
    }

    const html = await response.text();

    // A more robust regex to find the post ID in various formats within the HTML content or URL
    const regex = /"post_id":"(\d+)"|"story_fbid":"(\d+)"|"top_level_post_id":"(\d+)"|story_fbid=(\d+)|(?:posts|videos|photos)\/(\d+)/;
    const match = html.match(regex);

    if (match) {
      // The post ID will be in one of the capturing groups, filtering out undefined values
      const postId = match.slice(1).find(id => id !== undefined);
      if (postId) {
        return new Response(JSON.stringify({ postId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }
    
    throw new Error("Không thể tự động tìm thấy ID bài viết. Vui lòng kiểm tra lại link hoặc thử với một bài viết khác.");

  } catch (error) {
    console.error('Error fetching Facebook post ID:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})