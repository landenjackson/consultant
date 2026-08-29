import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TASK_PROFILES } from './src/taskProfiles.js';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Build a Strictly Categorized, Domain-Enforced System Prompt
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

CRITICAL MANDATE: STRICT ECONOMIC & UNIT REALISM FOR WORKSPACE: **${eco.name}**
👉 CLIENT BUSINESS TYPE: ${eco.businessType}
👉 ACTIVE CATEGORY: ${task.categoryName} (${task.objectiveFocus})
👉 TARGET DIRECTIVE: "${userGoal || task.categoryName}"

STRICT METRIC & NUMBER BOUNDARIES (NO CROSS-DOMAIN CONTAMINATION):
1. USE ONLY VALID ECONOMIC UNITS FOR THIS WORKSPACE:
   - Allowed Units for ${eco.name}: ${eco.allowedFinancialUnits}
   - Realistic Benchmark Ranges:
     ${JSON.stringify(eco.realisticRanges, null, 2)}
   - FORBIDDEN UNITS: ${eco.forbiddenMetrics}
   - NEVER put diner/restaurant numbers (covers, food prime costs, table turns) in Cleaver-Brooks or SaaS workspaces.
   - NEVER put software/SaaS numbers (CAC, LTV, MRR, ARR, churn) in Ma's Diner or Cleaver-Brooks workspaces.
   - NEVER put industrial boiler engineering metrics into Ma's Diner or Bannerman Crossings.

2. TELEMETRY TABLE FORMAT:
   - Output 6 distinct metrics strictly matching ${eco.name}'s industry economics and the topic "${userGoal || task.categoryName}".
   - Format: "• Metric Title: [Prominent Value] — [Plain-English operational rationale]"

3. TONE & VOCABULARY:
   - Boardroom partner standard (WSJ / McKinsey). Direct, candid, practical, and articulate. Zero robotic AI filler.

STRUCTURE:

### Strategic Reality & Operational Realities
(2 direct paragraphs analyzing "${userGoal || task.categoryName}" specifically for ${eco.name} within its industry realities.)

### Operational Telemetry & Targets
(6 distinct, calculated metrics strictly adhering to ${eco.name}'s allowed units and realistic economic ranges.)

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

    // Primary Google AI Studio Direct Call
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
