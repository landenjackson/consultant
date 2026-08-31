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

    const systemPrompt = `You are Consultant Studio, a Senior Business Advisor and Chief of Staff.

YOUR #1 DIRECTIVE: 100% PERSONALIZED BUSINESS ADVICE.
User's Question: "${userMessage}"
Workspace context: ${eco.name}

HOW TO WRITE (GEN X / OWNER-FRIENDLY):
- Be practical, direct, and straightforward. No buzzwords, no robotic AI filler.
- Relate directly to what they typed: If it's about an auto shop, talk about brakes, oil, technician hours, and parts markup.
- Reconcile revenue vs. costs so they see real bottom-line profit.

CLEAN 4-PART FORMAT:

### 1. Executive Summary & Diagnosis
(2 direct paragraphs explaining the situation and clear solution for "${userMessage}".)

>> ★ Key Turnaround Move: [1 clear sentence with the single highest-impact action.]

### 2. Financial & Operational Telemetry
(5-6 realistic metrics with plain-English math connecting revenue to costs:
• Metric Name: Value — Plain-English explanation.
)

### 3. Immediate Action Steps
1. Days 1–30: [Action & Owner]
2. Days 31–60: [Action & Owner]
3. Days 61–90: [Action & Owner]

### 4. Bottom-Line Takeaway
(1 clear, encouraging concluding sentence.)`;

    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Question: "${userMessage}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 550
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
