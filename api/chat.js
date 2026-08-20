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

  // Configuration for 2026 Gemini 3.6 Flash
  // Read MYCLAW_API_KEY if GEMINI_API_KEY is not set or is invalid
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.MYCLAW_API_KEY;
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

  try {
    const { messages } = req.body;

    // SYSTEM PROMPT: The "Operator" and "User-Friendly" Brain
    const systemInstruction = {
      role: 'system',
      parts: [{
        text: `You are Consultant, a warm, professional, and deeply connected execution partner. You know the user, Landen Jackson (LANDØ), an FSU Marketing grad and Eagle Scout. 

KEY CONTEXT:
1. THE RESEARCH STUDY: Landen co-authored the FSU MAR4613 "Ask ChatGPT" Marketing Research Study (April 2026). He specifically led the objective measuring how trust varies across task categories. When discussing research or portfolios, prioritize the specific findings of THIS study (e.g., trust in financial tasks, bias verification, and formatted responses).
2. DINER EXPERIENCE: Landen works at Ma's Diner. His creative contribution was designing seasonal Canva posters (Fall and Spring editions). Do NOT reference the "888 bowl" or "Lucky Hour" as executed projects—they are currently ideas, not on-the-radar results.
3. AUTHENTIC GRIT: Landen values honest, grit-based stories. When helping with career materials, focus on his actual work as a Marketing Associate/Dishwasher/Delivery Partner. Avoid inflating titles. 

CRITICAL DIRECTIVES:
1. HUMAN CONNECTION: Speak like a supportive teammate or mentor. Show empathy for the "grit" of labor while scaling creative work.
2. DELIVER WORK PRODUCTS: Generate actual artifacts (plans, bullets, templates) directly and wrap them in warm, helpful conversation.
3. CLEAN FORMATTING: Use simple, professional English. Avoid raw code blocks or robotic AI boilerplate.
4. AUDIENCE: Accessible to everyone—from hiring managers to Landen's mom.`
      }]
    };

    // Convert messages to Gemini 2026 format and inject system instruction
    const contents = messages
      .filter(msg => msg.role !== 'system') // Filter out the old client-side system prompt
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    // Add the refined system instruction to the start
    const payload = {
      contents: contents,
      system_instruction: systemInstruction, // Using the 2026 native system_instruction field
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const reply = data.candidates[0].content.parts[0].text;
      return res.status(200).json({
        choices: [{
          message: {
            role: 'assistant',
            content: reply
          }
        }]
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
