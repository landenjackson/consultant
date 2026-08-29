import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { tavily } from '@tavily/core';
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

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "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" });

// Build a dynamic research query from user prompt and workspace
function buildResearchQuery(userGoal, taskType, workspace) {
  const ws = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;
  if (userGoal && userGoal.length > 5) {
    return `${ws.name} ${userGoal} benchmarks statistics 2026`;
  }
  return `${ws.name} ${taskType} operational economics industry data`;
}

// Build a Grounded, Researched System Prompt with Live Evidence
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '', liveResearch = '') {
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

  return `You are Consultant, a Chief of Staff and Senior Partner at an elite management consultancy.

CRITICAL DIRECTIVE: ZERO FABRICATED GUESSES. EVERY METRIC MUST BE GROUNDED IN REAL ECONOMIC EVIDENCE.
👉 CLIENT / WORKSPACE: **${eco.name}** (${eco.businessType})
👉 TARGET TOPIC: "${userGoal || taskType}"
👉 VALID FINANCIAL UNITS FOR THIS DOMAIN: ${eco.allowedFinancialUnits}
👉 FORBIDDEN METRICS: ${eco.forbiddenMetrics}

${liveResearch ? `LIVE 2026 INDUSTRY RESEARCH & BENCHMARKS (USE THESE REAL NUMBERS):\n${liveResearch}\n` : ''}

STRICT RESEARCH-GROUNDED RULES:
1. NO CANNED OR FABRICATED GUESSES:
   - Calculate every single metric using real industry formulas, verified financial data, and the live research context provided above.
   - If analyzing **Ma's Diner**, calculate real restaurant prime costs (food prime 28-32%, labor 28-34%), actual table dwell minutes (28-40 min), and pedestrian walk-shed % from local demographics.
   - If analyzing **Cleaver-Brooks**, calculate real industrial boiler package capex ($75k-$850k), ASME combustion efficiencies (84-88.5%), and capital sales cycles (90-270 days).
   - If analyzing **SaaS / Agency**, calculate real CAC ($45-$140), LTV multipliers (3.5x-5.5x), and gross margins (>80%).
2. METRIC CITATION & FORMULA TRANSPARENCY:
   - For every metric, show the exact underlying formula or researched baseline in the explanation:
     • [Metric Name]: [Calculated Value] — [Explicit formula / real-world industry benchmark explaining how this number was derived].
3. ZERO FLUFF / WSJ COLUMNIST STANDARD:
   - 2 candid paragraphs per section. Direct, opinionated, boardroom-ready.

STRUCTURE:

### Strategic Reality & Operational Realities
(2 direct paragraphs analyzing what's actually happening on the ground regarding "${userGoal || taskType}" for ${eco.name} using researched industry realities.)

### Operational Telemetry & Targets
(Provide 6 distinct, calculated metrics strictly derived from research and domain formulas. Format with bold names and bold values.)

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

    // Fast, targeted live web research via Tavily (<1.2s)
    let liveResearch = '';
    const searchQuery = buildResearchQuery(userMessage, taskType, workspace);
    try {
      const searchRes = await tvly.search(searchQuery, { maxResults: 2, searchDepth: "basic" });
      if (searchRes?.results?.length) {
        liveResearch = searchRes.results
          .map(r => `• Source: ${r.title} (${r.url})\n  Data: ${r.content.substring(0, 300)}`)
          .join('\n\n');
      }
    } catch (e) {
      console.warn("Tavily search skipped/failed, proceeding with domain economic baseline.");
    }

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage, liveResearch);

    // Primary: Google AI Studio Direct API Call
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
              temperature: 0.65,
              maxOutputTokens: 850
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

    // Secondary: High-Reliability Gateway Fallback
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
