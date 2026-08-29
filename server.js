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

// Strict Topic-Bound Metric & Strategic Memo Generator
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

CRITICAL INSTRUCTION: EVERY SINGLE NUMBER AND PARAGRAPH MUST BE 100% CALCULATED FROM AND CORRELATED WITH THE USER'S SPECIFIC TEXT PROMPT:
👉 USER'S EXACT TOPIC / QUESTION: "${userGoal || task.categoryName}"
👉 ACTIVE CATEGORY: ${task.categoryName}
👉 CLIENT / WORKSPACE: ${workspace}

RULES FOR NUMBER CORRELATION:
1. MATHEMATICALLY TIED TO THE PROMPT:
   - If the user asks about "pricing a $49 course", every metric MUST calculate course conversion %, refund rates, Stripe processing fees on $49, and CAC for course buyers.
   - If the user asks about "cleaver brooks boiler retrofit sales", every metric MUST calculate enterprise RFP contract values ($50k - $250k), industrial sales cycle days (90-180 days), and technician labor utilization %.
   - If the user asks about "ma diner morning commuter rush", every metric MUST calculate commuter AOV ($10-$12), pedestrian walk-shed %, express queue times (<90 sec), and line balk rates.
   - NEVER output random disconnected numbers. The user must clearly see how every single metric is calculated directly from what they typed.

2. EXPLICIT METRIC STRUCTURE (EASY FOR ANYONE TO VERIFY):
Format each of the 6 metrics strictly as:
• [Metric Name Derived from Prompt]: [Calculated Value] — [Direct explanation showing how this connects to "${userGoal || task.categoryName}"]

3. TONE & VOCABULARY:
- Write like a senior partner in a boardroom. Direct, candid, practical, and articulate.
- NO generic filler ("In an environment marked by...", "occupies a distinct high ground").

STRUCTURE:

### Strategic Reality & Operational Realities
(2 direct, detailed paragraphs breaking down the ground truth of "${userGoal || task.categoryName}".)

### Operational Telemetry & Targets
(6 distinct, calculated metrics strictly derived from "${userGoal || task.categoryName}".)

### Frontline Action Plan
1. [Action Step 1 & Owner]
2. [Action Step 2 & Owner]
3. [Action Step 3 & Owner]

### Executive Takeaway
(1-2 sentence closing recommendation.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage);

    // Fast Google AI Studio Direct Call
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const googleAiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        
        const contents = messages
          .filter(m => m.role !== 'system')
          .slice(-2)
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

        const googleRes = await fetch(googleAiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: dynamicSystemPrompt }] },
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 900
            }
          })
        });

        if (googleRes.ok) {
          const googleData = await googleRes.json();
          const textContent = googleData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textContent) {
            return res.status(200).json({
              choices: [{ message: { role: 'assistant', content: textContent } }]
            });
          }
        }
      } catch (e) {}
    }

    // Secondary Gateway Fallback
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
        max_tokens: 900
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
