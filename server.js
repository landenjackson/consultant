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

STRICT OPERATIONAL RULES:
1. Ground every sentence in the exact business, location, product, or challenge typed/spoken above.
   - If analyzing Bannerman Crossings foot-traffic: Explicitly analyze the north Tallahassee corridor, Bannerman Commons pedestrian flow, morning vs. evening commuter habits, and store capture rates without discounts.
2. Reconcile Revenue vs. Costs with 5 realistic, calculated metrics matching this exact business.
3. Write in plain, clear, practical business English (no AI filler or corporate fluff).

FORMAT:

### 1. Executive Summary & Diagnosis
(2 concise, highly specific paragraphs directly diagnosing "${userMessage}".)

>> ★ Key Turnaround Move: [1 clear sentence with the single highest-impact action.]

### 2. Financial & Operational Telemetry
• Metric Name: Value — 1-sentence plain-English formula and financial impact.
• Metric Name: Value — 1-sentence plain-English formula and financial impact.
• Metric Name: Value — 1-sentence plain-English formula and financial impact.
• Metric Name: Value — 1-sentence plain-English formula and financial impact.
• Metric Name: Value — 1-sentence plain-English formula and financial impact.

### 3. Immediate Action Steps
1. Days 1–30: [Action & Role Owner]
2. Days 31–60: [Action & Role Owner]
3. Days 61–90: [Action & Role Owner]

### 4. Bottom-Line Takeaway
(1 direct, encouraging concluding sentence.)`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Primary: Google AI Studio Direct API using gemini-3.6-flash
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 800 }
      })
    });

    // If Google Free Tier is rate-limited, failover to MyClaw Gateway with Gemini 3.6
    if (!response.ok) {
      console.warn("Primary Google API exhausted/waiting, falling over to MyClaw Gateway...");
      response = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MYCLAW_API_KEY || '8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1'}`,
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          model: "gemini-3.6-flash",
          messages: [
            { role: 'system', content: promptText },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.65,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        // Fallback to gemini-2.5-flash on MyClaw
        response = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MYCLAW_API_KEY || '8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1'}`,
            'User-Agent': 'Mozilla/5.0'
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: 'system', content: promptText },
              { role: 'user', content: userMessage }
            ],
            temperature: 0.65,
            max_tokens: 800
          })
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        return res.status(500).json({ error: `Advisory engine error: ${errText}` });
      }

      const clawData = await response.json();
      return res.json(clawData);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    const content = textPart || "Strategic memo generated.";

    return res.json({
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
