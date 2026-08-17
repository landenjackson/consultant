export default async function handler(req, res) {
  // Enable CORS for your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Google Gemini API configuration
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCG4wF5eA3i6Ed3N_HsdDCavWvlKzuVYj8';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

  try {
    const { messages } = req.body;
    
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();
    
    // Extract the response text from Gemini format
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