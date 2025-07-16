// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

console.log(`[${new Date().toISOString()}] --- FUNCTION DEPLOYED/RESTARTED ---`);

serve(async (req) => {
  try {
    console.log(`[${new Date().toISOString()}] Received request: ${req.method} ${req.url}`);
    const url = new URL(req.url);

    // --- Webhook Verification from Facebook (GET request with params) ---
    if (req.method === 'GET' && url.searchParams.has('hub.mode')) {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const verifyToken = Deno.env.get('VERIFY_TOKEN');

      console.log("--- FACEBOOK VERIFICATION ATTEMPT ---");
      console.log("Mode from FB:", mode);
      console.log("Token from FB:", token);
      console.log("My Secret VERIFY_TOKEN:", verifyToken);

      if (mode === 'subscribe' && token === verifyToken) {
        console.log("SUCCESS: Verification successful. Returning challenge.");
        return new Response(challenge, { status: 200 });
      } else {
        console.error("ERROR: Verification FAILED. Tokens do not match or mode is not 'subscribe'.");
        return new Response('Forbidden - Verification Failed', { status: 403 });
      }
    }

    // --- Direct Browser Test (GET request without params) ---
    if (req.method === 'GET') {
        console.log("--- BROWSER TEST DETECTED ---");
        return new Response('Webhook is active. Ready for Facebook verification.', {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
        });
    }

    // --- Handle Incoming Messages (POST request) ---
    if (req.method === 'POST') {
      console.log("--- POST request received. Ignoring during debug phase. ---");
      // The actual message handling logic will be restored later.
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    // --- Handle other methods ---
    console.warn(`Method ${req.method} not allowed.`);
    return new Response('Method Not Allowed', { status: 405 });

  } catch (e) {
    console.error("--- CRITICAL ERROR IN FUNCTION ---");
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
})