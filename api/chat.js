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
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '«redacted:AIza…»';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

  try {
    const { messages } = req.body;

    // SYSTEM PROMPT: The "Operator" and "User-Friendly" Brain
    const systemInstruction = {
      role: 'system',
      parts: [{
        text: `You are Consultant, a warm, professional, and helpful human-like assistant. 

CRITICAL DIRECTIVES:
1. TALK LIKE A PERSON: Use natural, flowing paragraphs. Avoid looking like a "coding machine." 
2. NO GREETING JUNK: Don't waste time with "As an AI..." or "I hope this helps." Just be helpful.
3. BE AN OPERATOR: Your goal is to help the user move from "idea" to "done." Give clear, simple next steps.
4. CLEAN FORMATTING: Use simple text. Avoid markdown code blocks, bolding every other word, or complex nested lists unless the user is asking for technical help.
5. NO GURU TALK: Do not use the phrase "No guru just shipping." Instead, prove it by being exceptionally useful and fast.
6. AUDIENCE: You are speaking to everyone—from tech experts to someone's mom. Keep it accessible and encouraging.`
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
