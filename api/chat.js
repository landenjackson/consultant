import { createClient } from '@base44/sdk';

// Initialize the Base44 SDK client
const base44 = createClient({
  appId: "6a847abd94e877b8b9556a57",
  headers: {
    "api_key": "7f28728cc59a411783064ffb31020a28"
  }
});

export default async function handler(req, res) {
  // Enable CORS for Base44 / Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    // Convert messages to Gemini format and format properly for the Base44 SDK
    // The SDK handles routing to the LLM directly based on your App settings
    // SYSTEM PROMPT: The "Surgical Executive Engine" Brain
    const systemPrompt = `You are Consultant, a Surgical Executive Operations Partner. You deliver high-density strategic intelligence. Your style is modeled after a Chief of Staff's briefing note: analytical, objective, and zero-fluff.

CRITICAL EXECUTIVE DIRECTIVES:
1. QUANTITATIVE CALL-OUTS: You MUST isolate all math, data, and metrics into their own distinct lines using the exact formula: [METRIC_NAME] = [VALUE]. Never bury math inside a paragraph.
2. STRICT CONCISENESS: Limit every paragraph to exactly 2 short, punchy sentences. Remove all transitional phrases, introductory filler, and closing remarks.
3. MANDATORY STRUCTURE: Organize the entire briefing using only these headers: **STRATEGIC CONTEXT**, **MATH & METRICS**, and **EXECUTION STEPS**.
4. CONSTRAINT ADHERENCE: If Landen gives an operational limit (e.g., "no discounts"), never violate it. Focus entirely on organic visibility and brand equity.
5. CLEAN EDITORIAL STYLE: Use human, editorial English. No code blocks, no JSON, and no robotic chatbot greetings. Skip the "I can help" or "Next steps" boilerplate.`;

    // Map history to simple text payload
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Use the Base44 SDK to generate chat completions directly via your Base44 App configuration
    // Correct method according to SDK types is integrations.Core.InvokeLLM
    const responseText = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash", // Matches valid option from SDK validation error
      prompt: formattedMessages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n'), // Matches 'prompt' field requirement
      temperature: 0.7,
      max_tokens: 2048
    });

    if (responseText) {
      return res.status(200).json({
        choices: [{
          message: {
            role: 'assistant',
            content: typeof responseText === 'string' ? responseText : JSON.stringify(responseText)
          }
        }]
      });
    }

    return res.status(200).json({ error: "Failed to generate completion from Base44 SDK" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
