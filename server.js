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

// Fast, High-Density System Prompt
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

MANDATE: Output a crisp, high-density Strategic Advisory Memo in under 3 seconds.
👉 OBJECTIVE: "${userGoal || task.categoryName}"
👉 CATEGORY: ${task.categoryName} (${task.objectiveFocus})
👉 WORKSPACE: ${workspace}

LATENCY CONSTRAINTS:
1. PUNCHY: 2 dense paragraphs for strategic context.
2. TELEMETRY: Exactly 6 quantified metrics formatted as:
   • [Metric Title]: [Prominent Value] — [1-sentence explanation]
3. ROADMAP: Exactly 3 numbered steps.
4. SUMMARY: 1-sentence sign-off.

### Strategic Context & Operational Realities
(2 concise paragraphs analyzing "${userGoal || task.categoryName}".)

### Key Benchmarks & Operational Telemetry
(Provide 6 distinct metrics matching ${task.categoryName}.)

### Frontline Execution & Action Roadmap
1. [Action Step 1 & Owner]
2. [Action Step 2 & Owner]
3. [Action Step 3 & Owner]

### Executive Summary & Operator Gate
(1-sentence takeaway & sign-off.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage);

    // Direct High-Speed Gemini Flash Call (<3s latency)
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
        temperature: 0.7,
        max_tokens: 800 // Hard cap to guarantee 2-3s response time
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
