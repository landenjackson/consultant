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

// Universal Custom Question & Executive Advisory Engine
function buildDynamicSystemPrompt(taskType = 'custom', workspace = 'default', userGoal = '') {
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

CRITICAL DIRECTIVE: 100% DEEP GROUNDING ON THE USER'S EXACT INPUT.
- The user has entered a custom prompt/question: "${userGoal}"
- Client Workspace: ${eco.name} (${eco.businessType})

STRICT RULES:
1. ANSWER THE EXACT QUESTION ASKED:
   - Do NOT give a generic diner or manufacturing speech if the user asked about something specific (e.g. social media ads, hiring a manager, cash flow crisis, inventory waste, software tools, rebranding).
   - Address the specific pain point, bottleneck, or question directly in the first sentence.
   - Tailor every paragraph, number, and action item to directly solve what was typed.

2. DOMAIN & TOPIC-SPECIFIC TELEMETRY (6 METRICS):
   - Calculate 6 distinct metrics directly related to the user's specific question and ${eco.name}'s business economics.
   - Format: • [Metric Name]: [Calculated Value] — [1-sentence plain-English rationale showing how it connects directly to the user's question].
   - Include positive targets (e.g. +24% ROI) and risk/friction ceilings (e.g. <3% churn, -15% labor drag).

3. HIGH-IMPACT TURNAROUND CATALYST:
   - Single highest-leverage breakthrough action for this specific problem.
   - Prefix with ">> " to highlight as an executive catalyst.

4. CANDID, WSJ/MCKINSEY EXECUTIVE VOICE:
   - Zero generic filler ("In an economic environment marked by...").
   - Direct, authoritative, and practical advice.

STRUCTURE:

### Strategic Analysis & Core Solution
(2 direct paragraphs specifically answering: "${userGoal}")

>> [HIGH-IMPACT TURNAROUND CATALYST: 1-sentence breakthrough strategy specifically for this problem.]

### Operational Telemetry & Calculated Targets
(6 metrics calculated specifically for this topic. Format:
• [Metric Name]: [Value] — [Formula/rationale directly addressing "${userGoal}"].
)

### Frontline Action Plan
1. [Action Step 1 with Specific Role Owner, e.g. General Manager, Marketing Lead, Head of Ops]
2. [Action Step 2 with Specific Role Owner]
3. [Action Step 3 with Specific Role Owner]

### Executive Takeaway
(1-2 sentence direct concluding recommendation answering the prompt.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'custom', workspace = 'default' } = req.body;
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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.72,
        max_tokens: 950
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Strategic Engine error: ${errText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
