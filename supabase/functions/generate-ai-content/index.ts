// @ts-nocheck
// ... (phần đầu của file) ...

    let geminiData;
    const maxRetries = 3;
    const retryDelay = 1000;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      console.log(`[generate-ai-content] Attempt ${attempt}/${maxRetries} to call Gemini API.`);
      
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${aiSettings.google_gemini_api_key}`, {
          // ... (nội dung yêu cầu) ...
      });

      geminiData = await geminiRes.json();

      if (!geminiRes.ok) {
        if (geminiRes.status >= 500 && attempt < maxRetries) {
          console.warn(`[generate-ai-content] Gemini API returned status ${geminiRes.status}. Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw new Error(geminiData?.error?.message || `Lỗi gọi API Gemini với mã trạng thái ${geminiRes.status}.`);
      }

      const hasContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (hasContent) {
        console.log(`[generate-ai-content] Successfully received content on attempt ${attempt}.`);
        break; // Thoát khỏi vòng lặp nếu có nội dung
      }

      if (attempt < maxRetries) {
        console.warn(`[generate-ai-content] Received empty response from Gemini on attempt ${attempt}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`[generate-ai-content] Received empty response after ${maxRetries} attempts. Aborting.`);
        throw new Error("AI đã từ chối tạo nội dung, có thể do bộ lọc an toàn. Vui lòng thử lại với một prompt khác.");
      }
    }
    
// ... (phần còn lại của file) ...