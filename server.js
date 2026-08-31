import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'custom', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

    const promptText = `You are Consultant Studio, an elite Strategic Operations Partner.

CRITICAL MANDATE: ZERO VAGUENESS. 100% SPECIFIC TO THE USER'S EXACT WORDS.
User Spoken/Typed Input: "${userMessage}"
Workspace Context: ${eco.name} (${eco.businessType})

STRICT RULES:
1. DEEP TOPIC GROUNDING (NO GENERIC TALK):
   - Directly analyze the specific location, words, numbers, and operational details in the user's prompt.
   - If the user talks about Bannerman Crossings foot-traffic: Explicitly analyze the north Tallahassee / Bannerman Commons residential corridor, morning vs. evening pedestrian choke points, tenant dwell times, and physical store capture rates.
   - If they talk about an auto shop: Analyze bays, technicians, and parts.
   - If they talk about a clinic: Analyze patients, copays, and provider chairs.

2. ACCURATE NUMBERS & MATH (REVENUE VS. EXPENSES):
   - Provide 5 distinct metrics with real calculated numbers tailored strictly to this prompt.
   - Format: • [Metric Name]: [Calculated Value] — [1-sentence plain-English formula and financial/operational impact].

3. STRUCTURE:
### 1. Executive Summary & Diagnosis
(2 dense, highly specific paragraphs breaking down the ground truth of "${userMessage}".)

>> ★ Key Turnaround Move: [1 clear sentence with the single highest-leverage action.]

### 2. Financial & Operational Telemetry
(5 distinct metrics strictly matching this prompt)

### 3. Immediate Action Steps
1. Days 1–30: [Action & Role Owner]
2. Days 31–60: [Action & Role Owner]
3. Days 61–90: [Action & Role Owner]

### 4. Bottom-Line Takeaway
(1 direct concluding sentence.)`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Primary: Google AI Studio Direct API using gemini-3.6-flash
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 600 }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (textPart) {
        return res.json({ choices: [{ message: { role: "assistant", content: textPart } }] });
      }
    }

    console.warn("Falling over to MyClaw Gateway...");
    response = await fetch('https://api.myclaw.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MYCLAW_API_KEY || '8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1'}`,
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [{ role: 'system', content: promptText }, { role: 'user', content: userMessage }],
        temperature: 0.65,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Advisory engine error: ${errText}` });
    }

    const clawData = await response.json();
    return res.json(clawData);

  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
