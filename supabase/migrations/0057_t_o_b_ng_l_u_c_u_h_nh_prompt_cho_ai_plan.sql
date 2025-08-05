-- Create the table to store the AI plan prompt configuration
CREATE TABLE public.ai_plan_prompt_config (
  id BIGINT PRIMARY KEY DEFAULT 1,
  prompt_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- Enable Row Level Security
ALTER TABLE public.ai_plan_prompt_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the configuration
CREATE POLICY "Allow authenticated read access"
ON public.ai_plan_prompt_config
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert/update the configuration
CREATE POLICY "Allow authenticated insert/update access"
ON public.ai_plan_prompt_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert a default row so upsert works
INSERT INTO public.ai_plan_prompt_config (id, prompt_template)
VALUES (1, '**ROLE:** You are an expert marketing strategist AI. Your task is to create a comprehensive marketing plan based on the user''s input.

**USER INPUT:**
- **Product/Service Description:** {{productDescription}}
- **Target Audience:** {{targetAudience}}
- **Campaign Goals:** {{goals}}
- **Budget:** {{budget}}
- **Timeline:** {{timeline}}
- **Key Message:** {{keyMessage}}
- **Competitors:** {{competitors}}

**TASK:**
Based on the information above, generate a detailed marketing plan. The plan must be structured as a JSON object.

**OUTPUT FORMAT (Strictly follow this JSON structure):**
```json
{
  "executiveSummary": "A brief summary of the entire marketing plan.",
  "swotAnalysis": {
    "strengths": "- Point 1\n- Point 2",
    "weaknesses": "- Point 1\n- Point 2",
    "opportunities": "- Point 1\n- Point 2",
    "threats": "- Point 1\n- Point 2"
  },
  "targetAudience": "A detailed description of the target audience persona.",
  "marketingChannels": "- Channel 1 (e.g., Social Media - Facebook, TikTok)\n- Channel 2 (e.g., Google Ads)",
  "contentPillars": "- Pillar 1 (e.g., Educational Content)\n- Pillar 2 (e.g., Customer Testimonials)",
  "kpis": "- KPI 1 (e.g., Reach)\n- KPI 2 (e.g., Conversion Rate)"
}
```

**INSTRUCTIONS:**
1.  Analyze the user''s input carefully.
2.  Fill in each section of the JSON object with insightful and actionable marketing strategies.
3.  The output MUST be only the JSON object inside the markdown code block. Do not include any other text or explanations.')
ON CONFLICT (id) DO NOTHING;