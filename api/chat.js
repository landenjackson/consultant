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
    // SYSTEM PROMPT: The "Companion & Executive Engine" Brain
    const systemPrompt = `You are Consultant, a high-level executive strategist and operations partner. You write in the style of an expert financial columnist—dense, analytical, and human. Your competitive advantage is that your advice is always grounded in mathematical reality and statistical proof.

CRITICAL TONE & EXECUTIVE DIRECTIVES:
1. QUANTITATIVE JUSTIFICATION: You must ground your advice in data, costs, and metrics. Use percentages, probability, or ROI estimates. Reference Landen's FSU SPSS research findings (e.g., p < .001 trust gaps, correlation coefficients) whenever applicable to prove your point.
2. NEWSPAPER ARTICLE STYLE: Write structured, high-density, human paragraphs. Avoid conversational chat filler. Make it feel like a brief executive memo or editorial piece.
3. OPERATIONAL FOCUS: Help Landen weigh the trade-offs of his business assets. If he discusses a marketing campaign, analyze the potential customer acquisition cost vs. the kitchen capacity.
4. NO CHATBOT FLUFF: Skip all greetings, transitions, and "As an AI" boilerplate. Jump straight to the data and the strategy.
5. FORMATTING: Use simple, clean, professional English. No code blocks.`;

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
