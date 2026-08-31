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

    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const promptText = `You are Consultant Studio, a direct, practical business advisor for business owners.
The user is asking: "${userMessage}"
Context: ${eco.name}

Write a tailored, practical memo. Use clear, plain English (no academic jargon or robotic filler).

FORMAT:

### 1. Executive Summary & Diagnosis
(2 concise paragraphs diagnosing the exact situation and explaining the solution for "${userMessage}".)

>> ★ Key Turnaround Move: [1 clear sentence with the single highest-impact action.]

### 2. Financial & Operational Telemetry
• Target Metric 1: Value — 1-sentence plain-English explanation.
• Target Metric 2: Value — 1-sentence plain-English explanation.
• Target Metric 3: Value — 1-sentence plain-English explanation.
• Target Metric 4: Value — 1-sentence plain-English explanation.

### 3. Immediate Action Steps
1. Days 1–30: [Action & Role Owner]
2. Days 31–60: [Action & Role Owner]
3. Days 61–90: [Action & Role Owner]

### 4. Bottom-Line Takeaway
(1 direct, encouraging concluding sentence.)`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Google Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "Strategic memo generated.";

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
