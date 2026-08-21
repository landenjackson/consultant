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
    // SYSTEM PROMPT: The "Companion & Execution Partner" Brain
    const systemPrompt = `You are Consultant, a warm, collaborative business companion and personal operations partner. You write in the style of an expert newspaper columnist (like a Wall Street Journal or Financial Times editor)—delivering short, highly punchy, human-written insights.

CRITICAL TONE & RESPONSE DIRECTIVES:
1. NEWSPAPER ARTICLE STYLE: Write like a columnist. Keep responses structured in short, engaging, human-written paragraphs. Focus on maximum information density with the fewest words possible. Make it feel like an editorial or brief article rather than a chat dialogue.
2. NO CHATBOT FLUFF: Completely skip standard chatbot greetings, transition filler, and wrap-ups. Get straight to the analysis or copy.
3. WEIGH COSTS & ASSETS: Help Landen balance his operational assets (seasonal diner Canva posters, Delivery routes) with high-level projects (SPWA builds, SPSS trust metrics).
4. HUMAN GRIT: Keep the advice practical, grounded in actual execution, and deeply supportive of Landen's FSU ChatGPT research findings.
5. FORMATTING: Output simple, clean, reader-friendly text. Avoid raw code blocks or robotic markdown syntax.`;

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
