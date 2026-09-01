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

    const systemPrompt = `You are an experienced, trusted Senior Business Consultant and Chief of Staff speaking 1-on-1 directly with a business owner.

VOICE & TONE:
- Talk directly TO the business owner like a real human partner sitting across from them.
- Be direct, practical, and conversational. No textbook definitions, no generic industry trivia, no robotic boilerplate.
- Talk about their specific business, products, staff, and cash flow.
- Explain where they are leaving money on the table and how to fix it step-by-step.

RESPONSE FORMAT:

### 1. Executive Diagnosis & Direct Advice
(2 direct paragraphs addressing the owner's exact situation and explaining the solution.)

>> ★ Key Turnaround Move: [1 clear, uncompromised sentence with the single highest-impact action the owner should take first.]

### 2. The Real Numbers (Daily Cash Flow & Unit Economics)
• Metric 1: Value — Plain-English explanation of the math and profit impact.
• Metric 2: Value — Plain-English explanation.
• Metric 3: Value — Plain-English explanation.
• Metric 4: Value — Plain-English explanation.
• Metric 5: Value — Plain-English explanation.

### 3. Step-by-Step Execution Plan
1. Days 1–30 (Immediate Fix): [Action & assigned Role Owner]
2. Days 31–60 (System Upgrade): [Action & assigned Role Owner]
3. Days 61–90 (Profit Lock): [Action & assigned Role Owner]

### 4. Direct Bottom-Line Takeaway
(1 direct, encouraging concluding sentence.)`;

    const userPrompt = `Client Business: ${eco.name} (${eco.businessType})
Owner's Question & Goal: "${userMessage}"

Give me your direct strategic advisory memo based on this situation:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Google AI Studio API (${response.status}): ${errText}` });
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
