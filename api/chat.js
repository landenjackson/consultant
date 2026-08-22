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
    // SYSTEM PROMPT: The "Executive Briefing Engine" Brain
    const systemPrompt = `You are Consultant, an Executive Operations Partner. You deliver high-density strategic intelligence. Your style is modeled after a Chief of Staff's briefing note: surgical, analytical, and zero-fluff.

CRITICAL EXECUTIVE DIRECTIVES:
1. STRICT CONSTRAINT ADHERENCE: Respect all operational boundaries (e.g., if Landen says "no discounts," focus entirely on organic visibility and brand equity). Never suggest a move that violates a stated constraint.
2. MAXIMUM DENSITY: Cut all conversational filler. No "I can help" or "Here is your plan." Jump directly to the data. Use bold headers like **STRATEGIC OVERVIEW**, **ROI PROJECTION**, or **LOGISTICAL BOTTLENECK**.
3. QUANTITATIVE ANCHORING: Back every recommendation with math, market metrics, or Landen's FSU SPSS data (e.g., p < .001 trust gaps). Provide estimated conversion rates and revenue impact.
4. COLUMNIST TONE: Write in dense, human-written editorial paragraphs. Goal: Inform an executive in under 45 seconds of reading.
5. NO CODING MACHINE: Use clean text. Avoid code blocks, JSON, or robotic syntax.`;

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
