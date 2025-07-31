export const USD_TO_VND_RATE = 25400;

export const MODEL_PRICING: Record<string, { input: number; output: number; unit: 'token' }> = {
  // OpenAI
  'gpt-4o': { input: 5.00 / 1_000_000, output: 15.00 / 1_000_000, unit: 'token' },
  'gpt-4-turbo': { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000, unit: 'token' },
  'gpt-4': { input: 30.00 / 1_000_000, output: 60.00 / 1_000_000, unit: 'token' },
  
  // Google Gemini - Mapped from settings
  'gemini-1.5-pro': { input: 3.50 / 1_000_000, output: 10.50 / 1_000_000, unit: 'token' },
  'gemini-1.5-flash': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  'gemini-pro': { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000, unit: 'token' },
  'gemini-2.5-pro': { input: 3.50 / 1_000_000, output: 10.50 / 1_000_000, unit: 'token' },
  'gemini-2.5-flash': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  'gemini-2.5-flash-lite': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  'gemini-2.0-flash': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  'gemini-2.0-flash-preview-image-generation': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  'gemini-2.0-flash-lite': { input: 0.35 / 1_000_000, output: 1.05 / 1_000_000, unit: 'token' },
  
  // Default/Unknown
  'unknown': { input: 0, output: 0, unit: 'token' },
};

export const calculateCost = (log: any) => {
    const response = log.response;
    if (!response) return { model: 'unknown', inputTokens: 0, outputTokens: 0, costUSD: 0 };

    let model = 'unknown';
    let inputTokens = 0;
    let outputTokens = 0;

    // OpenAI format
    if (response.usage && response.model) {
        model = response.model;
        inputTokens = response.usage.prompt_tokens || 0;
        outputTokens = response.usage.completion_tokens || 0;
    } 
    // Gemini format (with added model_used field)
    else if (response.usageMetadata && response.model_used) {
        model = response.model_used;
        inputTokens = response.usageMetadata.promptTokenCount || 0;
        outputTokens = response.usageMetadata.candidatesTokenCount || 0;
    }

    const pricing = MODEL_PRICING[model] || MODEL_PRICING['unknown'];
    const costUSD = (inputTokens * pricing.input) + (outputTokens * pricing.output);

    return { model, inputTokens, outputTokens, costUSD };
};