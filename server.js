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

YOUR #1 RULE: DIRECT PERSONAL RELEVANCE.
The user is asking: "${userMessage}"
Workspace context: ${eco.name} (${eco.businessType})

WRITE FOR A BUSY BUSINESS OWNER (CLEAR, PRACTICAL, GEN X FRIENDLY):
- No academic jargon, no AI filler, no robotic templates.
- Write in plain English with realistic business math that directly answers the user's specific prompt.
- If the user asks about a pizza place, talk about pizza, ovens, cheese, and delivery drivers.
- If they ask about a dental office, talk about hygiene chairs, patient recalls, and insurance billing.
- Every single response must be 100% unique to what was asked.

STRUCTURE EVERY MEMO IN THIS CLEAN 4-PART FORMAT:

### 1. Executive Summary & Diagnosis
(In 2-3 clear paragraphs, directly diagnose the situation, explain what is happening, and provide a clear solution tailored specifically to "${userMessage}".)

>> ★ Key Turnaround Move: [1 clear sentence stating the single highest-impact action to take right now to grow profit or fix the problem.]

### 2. Financial & Operational Telemetry
(Provide exactly 5-6 realistic metrics showing real math—revenue vs. expenses—tailored strictly to this business and prompt. Format every line like this:
• Metric Name: Value — Plain-English explanation of the math and why it matters to the bottom line.
)

### 3. Immediate Action Steps
1. Immediate Move (Days 1–30): [Specific action with who is responsible, e.g., Owner, Manager, Lead Staff]
2. System & Process Upgrade (Days 31–60): [Specific operational or pricing change]
3. Margin Expansion (Days 61–90): [Specific long-term profit retention move]

### 4. Bottom-Line Takeaway
(1 clear, encouraging, executive-level concluding sentence.)`;

    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Question/Prompt: "${userMessage}"` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 850
      }
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal
    });

    clearTimeout(timeout);

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
