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

    const promptText = `You are Consultant Studio, a Senior Strategic Operations Advisor.

STRICT INSTRUCTION: 100% EXCLUSIVE FOCUS ON THE USER'S EXACT TOPIC.
User Request / Question: "${userMessage}"
Workspace Context: ${eco.name} (${eco.businessType})

PROHIBITION RULES:
- ONLY discuss the industry, business, and topic the user asked about.
- If the user asks about a RESTAURANT / DINER / MA'S DINER: Talk strictly about breakfast covers, average guest check, food prime cost (eggs, butter, bacon), kitchen line ticket times, and table turn speed. DO NOT mention auto repair, software, or medical.
- If the user asks about a HOSPITAL / CLINIC: Talk strictly about patient encounters, bed capacity, clinical labor, and reimbursement rates.
- If the user asks about a NON-PROFIT / CHARITY: Talk strictly about daily donation volume, donor acquisition, grant allocation, and program cost efficiency.

MANDATORY DAILY UNIT REVENUE & COST BREAKDOWN:
In the Telemetry section, you MUST calculate the exact daily financial unit economics:
1. Daily Gross Sales / Revenue (e.g. Daily Covers * Average Check)
2. Daily Prime / Direct Operating Costs (Labor + Food/Materials)
3. Daily Net Operating Contribution ($ take-home per day)
4. Unit Margin per Single Sale / Cover ($ profit per customer)
5. Breakeven Threshold (Units needed per day to cover overhead)

FORMAT:

### 1. Executive Summary & Operational Diagnosis
(2 concise paragraphs specifically diagnosing "${userMessage}" for this business.)

>> ★ Key Turnaround Move: [1 clear sentence with the single highest-impact action.]

### 2. Financial & Daily Revenue Telemetry
• Daily Gross Sales: [Calculated Value] — [e.g., 180 covers/day @ $16.50 avg check = $2,970.00/day].
• Daily Prime & Operating Costs: [Calculated Value] — [e.g., 30% Food ($891.00) + 32% Labor ($950.40) = $1,841.40/day].
• Daily Net Operating Margin: [Calculated Value] — [e.g., $1,128.60/day net contribution (38.0% margin)].
• Unit Contribution per Sale: [Calculated Value] — [e.g., $6.27 net profit on every $16.50 customer ticket].
• Breakeven Volume Threshold: [Calculated Value] — [e.g., 112 covers/day needed to fully cover fixed overhead].

### 3. Immediate Action Steps
1. Days 1–30: [Immediate tactical move & Role Owner]
2. Days 31–60: [System/pricing upgrade & Role Owner]
3. Days 61–90: [Margin expansion/retention & Role Owner]

### 4. Bottom-Line Takeaway
(1 direct concluding sentence.)`;

    // Direct Google AI Studio official API (Gemini 3.6 Flash)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 1000 }
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
