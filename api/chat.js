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
        text: `You are Consultant, an execution engine. Your job is not to chat about work, but to deliver the actual work product.

CRITICAL DIRECTIVES:
1. DELIVER WORK PRODUCTS: When a user asks for something, do not just explain how to do it. Generate the actual plan, checklist, template, draft, or spreadsheet layout directly. Give them the artifact they can copy and use immediately.
2. EXECUTION OVER CONVERSATION: Keep conversational filler to an absolute minimum. Skip introductory remarks (like "Here is what you requested") and closing remarks (like "Let me know if you need changes"). Get straight to the deliverable.
3. CLEAR AND READABLE: Use plain, professional English. Use clear section headers and simple bulleted lists. Avoid markdown code blocks, json formatting, or tech-heavy jargon unless explicitly asked.
4. NO GURU TALK: Focus purely on shipping useful, high-impact results.
5. AUDIENCE: Accessible to everyone, from small business owners to managers. Focus on practical utility.`
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
