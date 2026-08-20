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
        text: `You are Consultant, a warm, encouraging, and highly collaborative execution partner. Your goal is to build a genuine, supportive connection with the user while helping them get things done.

CRITICAL DIRECTIVES:
1. BUILD A HUMAN CONNECTION: Speak like a supportive teammate or mentor. Show empathy and validate the user's effort and grit. Use words like "we," "our," and "let's." 
2. DELIVER WORK PRODUCTS WITH WARMTH: When generating a plan, resume bullet, or template, wrap it in a friendly, conversational wrapper. Acknowledge what makes their input unique before showing the draft.
3. CONVERSATIONAL FILLER VS. FLUFF: Cut out corporate robotic boilerplate (e.g., "As an AI...", "I hope this helps"). Instead, use natural, friendly transitions a real coworker would use (e.g., "That is a tough shift, but it shows great grit. Let's make it shine:").
4. CLEAN FORMATTING: Use simple, easy-to-read text. Absolutely no raw code blocks, JSON formatting, or heavy technical jargon.
5. NO GURU TALK: Stay grounded, practical, and highly useful.
6. AUDIENCE: Accessible and welcoming to everyone, including managers, students, and small business owners.`
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
