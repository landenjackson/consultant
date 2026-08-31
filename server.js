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

    // Direct Google AI Studio official endpoint using models/gemini-2.5-flash with clean API version
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 650 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Google Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    const content = textPart || "Strategic memo generated.";

    res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: content
          }
        }
      ]
    });

  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
