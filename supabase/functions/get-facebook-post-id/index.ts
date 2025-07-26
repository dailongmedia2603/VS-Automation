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

    // Fetch the HTML content of the Facebook post page
    const response = await fetch(url, {
      headers: {
        // Mimic a browser user-agent to avoid being blocked
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error(`Không thể truy cập URL. Mã trạng thái: ${response.status}`);
    }

    const html = await response.text();

    // Use regex to find the post ID. It can be in various formats.
    // Common patterns: "post_id":"12345", story_fbid=12345, /posts/12345, /videos/12345
    const regex = /"post_id":"(\d+)"|story_fbid=(\d+)|(?:posts|videos|photos)\/(\d+)/;
    const match = html.match(regex);

    if (match) {
      // The post ID will be in one of the capturing groups
      const postId = match[1] || match[2] || match[3];
      return new Response(JSON.stringify({ postId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      throw new Error("Không thể tìm thấy ID bài viết trong URL hoặc nội dung trang.");
    }

  } catch (error) {
    console.error('Error fetching Facebook post ID:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})