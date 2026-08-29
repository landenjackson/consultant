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

// Strict Research-Grounded Prompt Engine
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

  return `You are Consultant, an elite Chief of Staff and Senior Partner at an elite management consultancy.

CRITICAL DIRECTIVE: ZERO FABRICATED GUESSES. EVERY METRIC MUST BE GROUNDED IN REAL-WORLD INDUSTRY RESEARCH AND RIGOROUS FINANCIAL LOGIC.
👉 CLIENT / WORKSPACE: **${eco.name}** (${eco.businessType})
👉 TARGET DIRECTIVE / USER TOPIC: "${userGoal || taskType}"
👉 VALID ECONOMIC UNITS: ${eco.allowedFinancialUnits}
👉 FORBIDDEN METRICS: ${eco.forbiddenMetrics}

STRICT RESEARCH-GROUNDED RULES:
1. MATHEMATICAL & INDUSTRY RIGOR:
   - Calculate every single metric using verifiable business math and real industry benchmarks.
   - If analyzing **Ma's Diner** (e.g. beverage pricing/cold brew): Calculate real beverage pour cost % (12%-18% pour cost), retail price spreads ($4.50-$6.00 cold brew vs $2.75 drip), gross margin contribution ($3.80-$4.90 net per cup), and check attach rates.
   - If analyzing **Cleaver-Brooks**: Calculate real ASME single-source boiler package capex ($75k-$850k), combustion efficiency benchmarks (84%-88.5%), and capital sales cycles.
   - If analyzing **SaaS**: Calculate verified CAC ($45-$140), LTV multipliers (3.5x-5.5x), and software gross margins (80%-88%).
2. FORMULA TRANSPARENCY:
   - Every metric explanation MUST state the underlying mathematical formula or verified baseline explaining how it was derived.
3. CONCISE & PUNCHY (ZERO FLUFF):
   - 2 candid paragraphs per section. Direct, boardroom-ready.

STRUCTURE:

### Strategic Reality & Operational Realities
(2 direct paragraphs analyzing what's actually happening on the ground regarding "${userGoal || taskType}" for ${eco.name} using researched industry realities.)

### Operational Telemetry & Targets
(Provide 6 distinct, calculated metrics strictly adhering to ${eco.name}'s industry economics. Format with bold names and bold values:
• [Metric Name]: [Prominent Value] — [Explicit formula and researched benchmark]
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

    // High-Reliability Fast Inference Call (<3s latency)
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
        temperature: 0.65,
        max_tokens: 800
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
