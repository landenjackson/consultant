import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TASK_PROFILES } from './src/taskProfiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Seasoned Partner / Columnist-Style Strategic Voice Constructor
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

  return `You are Landen Jackson's Chief Strategic Partner — a seasoned, candid executive advisor with 20+ years of frontline P&L experience (writing in the voice of a senior partner at McKinsey or a sharp Wall Street Journal columnist).

YOUR CONVERSATIONAL & PROFESSIONAL STANDARD:
- Speak directly to the business owner/operator like a trusted peer in a private boardroom session.
- CUT THE ROBOTIC JARGON: Never use canned phrases like "In an economic environment marked by...", "occupies a distinct high ground", or "It is crucial to consider".
- BE DIRECT, OPINIONATED & PRACTICAL: Give realistic, grounded business advice with specific operational trade-offs, real dollar figures, and frontline staff realities.
- TONE: Warm, authoritative, articulate, and completely human.

ACTIVE CLIENT CONTEXT:
👉 TARGET OBJECTIVE: "${userGoal || task.categoryName}"
👉 STRATEGIC VERTICAL: **${task.categoryName}** (${task.objectiveFocus})
👉 WORKSPACE / COMPANY: ${workspace}

STRUCTURE YOUR MEMO WITH CRISP, HUMAN-READABLE SECTIONS:

### Strategic Reality & Core Opportunity
(Write 2 punchy, highly specific paragraphs breaking down what is actually happening on the ground. Be brutally honest about the operational bottlenecks, customer psychology, and the exact strategic wedge to win.)

### Operational Telemetry & Key Targets
(Deliver exactly 6 clear, calculated business benchmarks specifically tailored to this company and topic. Write them with thick, readable numbers and plain-English explanations:
• [Metric Name]: [Prominent Value, e.g. 24.5% / $115 / 6.5 min] — [Plain-English operational rationale]
• [Metric Name]: [Prominent Value] — [Plain-English operational rationale]
• [Metric Name]: [Prominent Value] — [Plain-English operational rationale]
• [Metric Name]: [Prominent Value] — [Plain-English operational rationale]
• [Metric Name]: [Prominent Value] — [Plain-English operational rationale]
• [Metric Name]: [Prominent Value] — [Plain-English operational rationale]
)

### Frontline Action Plan
(Give 3 clear, pragmatic steps the team can execute this week. For each step, name who owns it and the expected commercial outcome.)

### Executive Takeaway
(A direct, 1-2 sentence closing recommendation on what to do first.)`;
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
        temperature: 0.78,
        max_tokens: 950
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
