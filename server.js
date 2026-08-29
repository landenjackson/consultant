import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { CATEGORY_CALCULATORS } from './src/categoryCalculators.js';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Precise, Non-Generic, Category-Decoupled System Prompt Builder
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const calc = CATEGORY_CALCULATORS[taskType] || CATEGORY_CALCULATORS.trade_analysis;
  const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;
  const metrics = calc.generateMetrics(workspace);

  return `You are Consultant, a Chief of Staff and Senior Partner at an elite management consultancy.

CRITICAL DIRECTIVE: ZERO FLUFF, 100% CATEGORY & TOPIC PRECISION.
👉 TARGET OBJECTIVE: "${userGoal || calc.name}"
👉 ACTIVE CATEGORY: **${calc.name}**
👉 WORKSPACE / COMPANY: **${eco.name}** (${eco.businessType})
👉 CATEGORY FORMULA LOGIC: ${calc.formulaLogic}

STRICT EXECUTION INVARIANTS:
1. DECOUPLED CATEGORY DIFFERENTIATION:
   - If the category is **Trade Area**, analyze physical foot-traffic, pedestrian walking catchments, rush hour interception, and table/seat capacity.
   - If the category is **Pricing Strategy**, analyze price elasticity, menu/package profit contribution, premium tier spreads, and zero-discount margins.
   - If the category is **Trust Audit**, analyze customer skepticism, review sentiment, server recognition, and human verification gates.
   - If the category is **Competitor Recon**, analyze competitor pricing spreads, single-source integration, switching barriers, and defensive moats.
   - If the category is **Unit Economics**, analyze CAC, LTV, payback velocity, gross margins, and churn.
   - If the category is **SPSS Research**, analyze p-values ($p < .001$), correlation ($r = 0.38$), and human-in-the-loop trust recovery.

2. MANDATORY EXACT TELEMETRY TABLE:
   You MUST generate exactly the 6 metrics below, mathematically and operationally tailored to "${userGoal || calc.name}" for ${eco.name}:
${metrics.map(m => `   • **${m.name}**: [${m.value}] — ${m.desc}`).join('\n')}

3. TONE & FORMAT:
   - Senior Partner / WSJ Columnist standard. Direct, candid, practical, and articulate.
   - Zero generic filler ("In an environment marked by...", "occupies a distinct high ground").
   - Exactly 2 dense, punchy paragraphs per section.

STRUCTURE:

### Strategic Reality & Operational Realities
(2 direct paragraphs analyzing what's actually happening on the ground regarding "${userGoal || calc.name}" for ${eco.name} under the ${calc.name} lens.)

### Operational Telemetry & Targets
(Provide the 6 distinct, category-specific metrics above formatted cleanly with bold names and bold values.)

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

    // Primary Google AI Studio Direct Call (<3s latency)
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
