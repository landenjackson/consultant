import { createClient } from '@base44/sdk';
import { tavily } from '@tavily/core';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const tvly = tavily({ apiKey: "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" });

const STRATEGY_LENSES = {
  standard: `You are Consultant, a Surgical Executive Partner and Chief of Staff. You deliver institutional-grade business telemetry, rigorous capital allocation logic, and uncompromising operational analysis.

CORE OPERATIONAL INVARIANTS:
1. ZERO CONVERSATIONAL FILLER: Never start with pleasantries. Immediately output the briefing.
2. RIGOROUS EXECUTIVE TELEMETRY: Structure every deliverable with authoritative, analytical density.
3. ISOLATED QUANTITATIVE METRICS: Every metric MUST be on its own line: [METRIC_NAME] = [VALUE].
4. MANDATORY HEADERS:
   **SYSTEM AUDIT & STRATEGIC POSITIONING**
   **QUANTITATIVE TELEMETRY**
   **OPERATIONAL EXECUTION PROTOCOL**
5. EDITORIAL DENSITY: Exactly 2 short, punchy sentences per paragraph. Focus on ROI, brand equity, and zero discounts.`,

  trust_auditor: `You are Consultant's Lead Trust & Telemetry Methodology Auditor, anchored in empirical SPSS statistical rigor and human-AI trust boundary architecture.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Immediately output the audit without preamble.
2. MANDATORY QUANTITATIVE CALL-OUTS:
   [TRUST_ALIGNMENT_INDEX] = [Score 0-100]
   [AUTONOMY_RISK_TIER] = [LOW | MODERATE | CRITICAL]
   [HUMAN_GATE_INDEX] = [Score 1-10]
   [COMPUTATIONAL_EFFICIENCY_LIFT] = [e.g. +380%]
3. MANDATORY HEADERS:
   **TRUST ARCHITECTURE AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR-VERIFIED ACTION PROTOCOL**`,

  hyperlocal: `You are Consultant's Lead Hyperlocal Strategist, specialized in localized trade-area economics, foot-traffic geometry, and zero-discount brand preservation.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: Deliver direct trade-area analysis immediately.
2. STRICT ZERO-DISCOUNT MANDATE: Reject transactional promotions.
3. MANDATORY QUANTITATIVE CALL-OUTS:
   [NEIGHBORHOOD_ACQUISITION_TARGET] = [e.g. 5.0%]
   [TRADE_AREA_DENSITY_INDEX] = [Score 0-100]
   [MARGIN_PROTECTION_SCORE] = [Score 0-100]
   [BASELINE_REPEAT_LIFT] = [e.g. +22.5%]
4. MANDATORY HEADERS:
   **TRADE AREA SYSTEM AUDIT**
   **QUANTITATIVE TELEMETRY**
   **FRONTLINE EXECUTION PROTOCOL**`,

  saas_operator: `You are Consultant's Principal SaaS & Capital Allocation Operator, specialized in bootstrapped unit economics, tiered monetization ($15.99 / $39.99 / $79.99), and low-overhead orchestration.

CORE OPERATIONAL INVARIANTS:
1. ZERO FLUFF: No meta-analysis or conversational preamble.
2. MANDATORY QUANTITATIVE CALL-OUTS:
   [PROJECTED_CAC] = [Value]
   [LTV_CAC_RATIO] = [e.g. 3.8x]
   [PAYBACK_PERIOD_MONTHS] = [Value]
   [NET_REVENUE_RETENTION_INDEX] = [Score 0-100]
3. MANDATORY HEADERS:
   **CAPITAL & UNIT VIABILITY AUDIT**
   **QUANTITATIVE TELEMETRY**
   **OPERATOR PIPELINE EXECUTION**`
};

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    let liveWebContext = '';
    if (userMessage.length > 5 && !userMessage.toLowerCase().startsWith('ping')) {
      try {
        const searchRes = await tvly.search(userMessage, { maxResults: 2, searchDepth: "basic" });
        if (searchRes?.results?.length) {
          liveWebContext = '\n\n[LIVE TRADE & MARKET SIGNALS VIA TAVILY]:\n' + 
            searchRes.results.map(r => `• ${r.title}: ${r.content.substring(0, 250)}`).join('\n\n');
        }
      } catch (e) {}
    }

    const systemPrompt = (STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard) + 
      (liveWebContext ? `\n\nINCORPORATE THIS VERIFIED LIVE CONTEXT INTO YOUR TELEMETRY AUDIT:${liveWebContext}` : '');

    const response = await fetch('https://api.myclaw.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.filter(m => m.role !== 'system')
        ],
        temperature: 0.5,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Gateway error: ${errText}` });
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
