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
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Beta Strategic Executive Prompt Engine (Highlighting Turnaround Catalysts & Satisfaction Drivers)
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

CRITICAL INSTRUCTION: Deliver a boardroom-ready, highly actionable Strategic Advisory Memo for **${eco.name}** (${eco.businessType}) specifically on: **"${userGoal || taskType}"**.

BETA EXECUTION & REVENUE CATALYST RULES:
1. HIGHLIGHT HIGH-IMPACT TURNAROUND FACTORS:
   - Identify the single highest-leverage operational trigger that accelerates cash flow, eliminates customer friction, and builds satisfaction.
   - Prefix this key turnaround insight with ">> " so the system highlights it as an executive catalyst card.
2. HEALTH-INDEXED NUMERICAL TELEMETRY:
   - Deliver 6 distinct, mathematically grounded metrics.
   - For positive metrics/growth targets: State healthy positive targets (e.g. +34.2% lift, 100% margin defense, 92% retention).
   - For risk/friction areas: Explicitly isolate the friction points (e.g. -42% line-balk drop, <1.4% churn, <120s handoff lag) so operators see risks clearly highlighted in red.
3. SATISFACTION-DRIVEN, HUMAN BUSINESS PROSE:
   - Write in the articulate, candid voice of a senior partner at McKinsey or a sharp Wall Street Journal columnist.
   - Eliminate all robotic AI filler ("In an environment marked by...", "occupies a distinct high ground").

STRUCTURE:

### Strategic Reality & Core Opportunity
(2 direct paragraphs breaking down the ground truth of "${userGoal || taskType}" for ${eco.name}.)

>> [HIGH-IMPACT TURNAROUND CATALYST: 1-sentence breakthrough strategy that unlocks immediate revenue and customer satisfaction.]

### Operational Telemetry & Targets
(Provide 6 distinct metrics strictly matching ${eco.name}'s industry economics and the prompt. Format as:
• [Metric Name]: [Value] — [Formula & operational explanation showing how this metric drives business health].
)

### Frontline Action Plan
1. [Action Step 1 & Specific Role Owner]
2. [Action Step 2 & Specific Role Owner]
3. [Action Step 3 & Specific Role Owner]

### Executive Takeaway
(1-2 sentence direct closing recommendation.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage);

    const response = await fetch('https://api.myclaw.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MYCLAW_API_KEY || '8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1'}`,
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          { role: 'system', content: dynamicSystemPrompt },
          ...messages.filter(m => m.role !== 'system').slice(-2)
        ],
        temperature: 0.68,
        max_tokens: 850
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Strategic Engine error: ${errText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Consultant Studio live at port ${port}`);
});
