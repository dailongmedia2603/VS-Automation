// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

console.log("--- DEBUG FUNCTION LOADED ---"); // Ghi log khi function được tải

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);

  // --- Webhook Verification (GET request) ---
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('VERIFY_TOKEN');

    console.log("--- GET Request Details ---");
    console.log("Mode from FB:", mode);
    console.log("Token from FB:", token);
    console.log("My Secret VERIFY_TOKEN:", verifyToken); // Log cả token của bạn để so sánh

    if (mode === 'subscribe' && token === verifyToken) {
      console.log("SUCCESS: Verification successful. Returning challenge.");
      return new Response(challenge, { status: 200 });
    } else {
      console.error("ERROR: Verification FAILED. Tokens do not match or mode is not 'subscribe'.");
      return new Response('Forbidden - Verification Failed', { status: 403 });
    }
  }

  // Đối với các yêu cầu khác (như POST), chỉ cần trả lời OK trong khi gỡ lỗi
  console.log(`Ignoring ${req.method} request during debug phase.`);
  return new Response('OK', { status: 200 });
})