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

    const systemPrompt = `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

DIRECTIVE: Deliver a fast, dense, boardroom-ready advisory briefing for **${eco.name}** (${eco.businessType}).
User Question / Directive: "${userMessage}"

STRICT P&L & UNIT-ECONOMIC CORRELATION RULES:
1. EXPLICIT REVENUE & EXPENSE RECONCILIATION:
   - All numbers MUST strictly align with the authentic financial scale of this specific discipline.
   - You MUST explicitly state the Gross Revenue, the Direct Costs/Overhead (COGS/Labor/Facility), and the resulting Net Operating Margin.
   - Example 1 (Therapy/Psychology): 25 billable hrs/wk @ $185/hr = $18,500/mo Gross Revenue. Minus $3,800/mo Overhead (EHR, suite lease, billing) = $14,700/mo Net Contribution (79.5% Net Margin).
   - Example 2 (Medical Practice): 22 patients/day @ $195 reimbursement = $94,380/mo Gross Collections. Minus $32,000 Staff Labor (34%) + $11,500 Clinic Overhead = $50,880/mo Net Margin (53.9%).
   - Example 3 (Engineering Firm): $210/hr blended billable rate @ 3.1x labor multiplier on $68/hr direct salary = $142/hr Gross Margin per billable engineer.
   - Example 4 (Fitness/Gym): 240 members @ $169/mo dues = $40,560/mo Recurring Revenue. Minus $17,000 Trainer Splits (42%) + $8,200 Facility Rent = $15,360/mo Net Profit.

2. TELEMETRY TABLE (6 CALCULATED BENCHMARKS):
   - Provide 6 distinct, mathematically grounded metrics with explicit formulas showing how revenue and costs connect.
   - Format: • [Metric Name]: [Calculated Value] — [Explicit formula and financial impact on revenue vs cost].

3. HIGH-IMPACT TURNAROUND CATALYST:
   - Include ">> [HIGH-IMPACT TURNAROUND CATALYST: 1-sentence breakthrough operational lever that expands net margin.]"

4. FRONTLINE ACTION PLAN & ROLE OWNERS:
   - 3 concrete action steps with specific role owners.

5. 1-SENTENCE EXECUTIVE TAKEAWAY.`;

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Official Google AI Studio endpoint using models/gemini-3.6-flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }]
        }
      ],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 1000
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Google Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "Strategic memorandum generated.";

    res.json({
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
