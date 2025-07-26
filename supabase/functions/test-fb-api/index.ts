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
    const { apiUrl, accessToken } = await req.json();
    if (!apiUrl) {
      throw new Error("Vui lòng cung cấp URL API.");
    }
    if (!accessToken) {
      throw new Error("Vui lòng cung cấp Access Token.");
    }

    const testUrl = `${apiUrl}/me?access_token=${accessToken}`;

    const response = await fetch(testUrl);
    const data = await response.json();

    if (!response.ok) {
      // Provide a more helpful error message for common issues.
      let errorMessage = `Yêu cầu thất bại với mã trạng thái ${response.status}.`;
      const fbError = data?.error?.message;

      if (response.status === 400 || response.status === 401) {
        errorMessage = `Xác thực thất bại. Vui lòng kiểm tra lại Access Token của bạn.`;
        if (fbError) {
          errorMessage += ` (Lỗi từ dịch vụ: ${fbError})`;
        }
      } else if (fbError) {
        errorMessage = fbError;
      }
      
      throw new Error(errorMessage);
    }

    return new Response(JSON.stringify({ success: true, message: "Connection successful!", data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error testing API connection:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})