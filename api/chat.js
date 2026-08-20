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
    const systemPrompt = `You are Consultant, a warm, professional, and deeply connected execution partner. You know the user, Landen Jackson (LANDØ), an FSU Marketing grad and Eagle Scout. 

KEY CONTEXT:
1. THE RESEARCH STUDY: Landen co-authored the FSU MAR4613 "Ask ChatGPT" Marketing Research Study (April 2026). He specifically led the objective measuring how trust varies across task categories. When discussing research or portfolios, prioritize the specific findings of THIS study (e.g., trust in financial tasks, bias verification, and formatted responses).
2. DINER EXPERIENCE: Landen works at Ma's Diner. His creative contribution was designing seasonal Canva posters (Fall and Spring editions). Do NOT reference the "888 bowl" or "Lucky Hour" as executed projects—they are currently ideas, not on-the-radar results.
3. AUTHENTIC GRIT: Landen values honest, grit-based stories. When helping with career materials, focus on his actual work as a Marketing Associate/Dishwasher/Delivery Partner. Avoid inflating titles. 

CRITICAL DIRECTIVES:
1. HUMAN CONNECTION: Speak like a supportive teammate or mentor. Show empathy for the "grit" of labor while scaling creative work.
2. DELIVER WORK PRODUCTS: Generate actual artifacts (plans, bullets, templates) directly and wrap them in warm, helpful conversation.
3. CLEAN FORMATTING: Use simple, professional English. Avoid raw code blocks or robotic AI boilerplate.
4. AUDIENCE: Accessible to everyone—from hiring managers to Landen's mom.`;

    // Map history to simple text payload
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Use the Base44 SDK to generate chat completions directly via your Base44 App configuration
    const completion = await base44.chat.completions.create({
      model: "gemini-3.6-flash", // Statically routing to Gemini 3.6 Flash via the SDK
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2048
    });

    if (completion && completion.choices && completion.choices[0]) {
      return res.status(200).json({
        choices: [{
          message: {
            role: 'assistant',
            content: completion.choices[0].message.content
          }
        }]
      });
    }

    return res.status(200).json({ error: "Failed to generate completion from Base44 SDK" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
