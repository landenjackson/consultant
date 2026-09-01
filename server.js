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

    const apiKey = process.env.GEMINI_API_KEY;

    const promptText = `You are Consultant Studio, a Senior Strategic Operations Advisor and Quantitative Analyst.

CRITICAL MANDATE: ABSOLUTELY ZERO ARBITRARY GUESSWORK.
Every single insight, benchmark, and dollar figure MUST be derived from real industry financial statements, verified P&L benchmarks (e.g. SEC 10-K filings, National Restaurant Association Operating Ratios, Bureau of Labor Statistics data, or ASME engineering cost indexes), and proven marketing unit economics.

Target Inquiry / Business: "${userMessage}"
Workspace Context: ${eco.name} (${eco.businessType})

STRICT GROUNDING & METHODOLOGY RULES:
1. P&L FINANCIAL STATEMENT CORRELATION:
   - Calculate exact unit economics: Show the math connecting Gross Revenue, Cost of Goods Sold (COGS), Direct Labor, Fixed Overhead, and Net Operating Margin.
   - Explain WHY each ratio exists based on real balance sheet and income statement mechanics.
2. MARKETING & RETENTION ANALYTICS:
   - Correlate acquisition costs (CAC) with customer lifetime value (LTV), retention cohorts, and zero-discount pricing elasticity.
   - Show how marketing moves directly alter daily cash flow and per-ticket/per-order contribution.
3. GROUNDED BENCHMARK CITATIONS:
   - Support your findings with recognized industry accounting standards and empirical research benchmarks.

FORMAT YOUR RESPONSE IN THIS CLEAN 4-PART EXECUTIVE MEMORANDUM:

### 1. Executive Summary & Financial Statement Diagnosis
(2 dense, analytical paragraphs auditing the operational baseline, cost structure, and financial reality of "${userMessage}". Identify exact cost leaks and margin compression vectors.)

>> ★ Key Turnaround Move: [1 clear, uncompromised strategic lever that directly protects cash flow and expands net contribution margin.]

### 2. Verified Financial Telemetry & Daily P&L Economics
(Provide 5 distinct metrics with explicit formulas showing revenue vs. expense reconciliation:
• [Metric Name]: [Calculated Value] — Formula: [Explicit mathematical calculation]. Economic impact on daily cash flow and bottom-line profit.
• [Metric Name]: [Calculated Value] — Formula: [Explicit mathematical calculation]. Economic impact on daily cash flow and bottom-line profit.
• [Metric Name]: [Calculated Value] — Formula: [Explicit mathematical calculation]. Economic impact on daily cash flow and bottom-line profit.
• [Metric Name]: [Calculated Value] — Formula: [Explicit mathematical calculation]. Economic impact on daily cash flow and bottom-line profit.
• [Metric Name]: [Calculated Value] — Formula: [Explicit mathematical calculation]. Economic impact on daily cash flow and bottom-line profit.
)

### 3. Frontline Marketing & Operational Execution Plan
1. Phase 1 (Days 1–30 | Immediate Margin Stabilization): [Specific action with assigned role owner, operational metric to track, and expected cash flow return]
2. Phase 2 (Days 31–60 | Process Optimization & Retention Loop): [Specific marketing/process protocol with role owner and P&L target]
3. Phase 3 (Days 61–90 | Capital & Scale Defense): [Long-term pricing defense, zero-discount enforcement, and asset utilization move]

### 4. Industry Benchmark & Methodological Footnotes
• [1] [Specific verified industry standard or accounting baseline supporting the cost ratios, e.g. NRA State of the Industry P&L ratios, BLS Q2 wage data, or SEC 10-K commercial benchmark].
• [2] [Empirical marketing science or retention data supporting the unit economics and pricing elasticity].

### 5. Bottom-Line Takeaway
(1 direct, authoritative closing recommendation summarizing the immediate capital priority.)`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 1200 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Google AI Studio API (${response.status}): ${errText}` });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    const content = textPart || "Strategic memo generated.";

    return res.json({
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
