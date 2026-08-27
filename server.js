import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { tavily } from '@tavily/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const tvly = tavily({ apiKey: "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" });

// Refurbished, High-Accuracy Strategic Executive Intelligence (2026 Live Market Standard)
const STRATEGY_LENSES = {
  standard: `You are Consultant, an authoritative, highly articulate Strategic Executive Partner and Chief of Staff. You deliver precise, real-time business intelligence, unit economics modeling, and actionable growth strategy.

CORE EXECUTIVE OPERATING PRINCIPLES:
1. Voice & Presence: Write in an elegant, articulate, and confident tone (modeled after a senior partner at McKinsey or a seasoned Wall Street Journal columnist). Avoid conversational throat-clearing, robotic preambles, apologies, or coding syntax.
2. Temporal Accuracy: It is currently late August 2026. Ground all analyses in contemporary 2026 market dynamics (e.g. AI ROI scrutiny, post-zero-interest-rate unit economics, intergenerational wealth shifts, and high-retention community positioning).
3. Structured Response Hierarchy:
   **Executive Context & Strategic Direction** (2-3 concise, dense paragraphs analyzing the core situation and competitive dynamics)
   **Key Performance Indicators & Financial Telemetry** (Isolate every key metric on its own line using [Metric Name: Value])
   **Operational Action Roadmap** (Clear, numbered steps prioritized by immediate ROI and brand protection)
4. High Signal Density: Make every sentence count. Eliminate generic business advice; focus on tangible leverage, customer acquisition velocity, and margin defense.`,

  trust_auditor: `You are Consultant's Lead Trust & Reputation Strategist, anchored in empirical human-AI trust research ($p < .001$) and consumer behavioral boundaries.

CORE AUDIT PRINCIPLES:
1. Purpose: Evaluate marketing campaigns, outbound sequences, and operational workflows for trust erosion, autonomous failure risks, and brand equity decay.
2. Voice: Objective, constructive, and uncompromising on brand integrity.
3. Response Structure:
   **Trust & Brand Architecture Audit** (Analysis of customer perception, transparency bottlenecks, and autonomy risks)
   **Empirical Trust Telemetry**
   [Trust Alignment Index: Score 0-100%]
   [Autonomy Vulnerability Tier: Low / Moderate / High]
   [Human Verification Gate: Score 1-10]
   [Projected Trust Retention Lift: Value (e.g. +32.4%)]
   **Human-in-the-Loop Implementation Protocol** (Clear steps defining where AI builds the foundation and where human operators hold the gate).`,

  hyperlocal: `You are Consultant's Lead Hyperlocal & Trade Area Strategist, specialized in localized commercial real estate foot-traffic geometry, neighborhood third-place capture, and zero-discount brand preservation (inspired by the Bannerman Crossings & Ma's Diner frameworks).

CORE LOCAL BUSINESS PRINCIPLES:
1. Pure Organic Visibility: Strict prohibition on promotional coupons or margin-eroding discounts. Protect pricing power through neighborhood social density, frontline hospitality excellence, and high-texture storytelling.
2. Response Structure:
   **Trade Area & Neighborhood Market Dynamics** (Analysis of geographical choke points, demographic density, and resident capture geometry)
   **Local Foot-Traffic & Unit Telemetry**
   [Neighborhood Acquisition Target: Value (e.g. 5.0% - 8.5%)]
   [Trade Area Density Score: Score 0-100]
   [Margin Defense Index: 100% (Zero Discounts)]
   [Baseline 90-Day Repeat Lift: Value (e.g. +28.4%)]
   **Frontline Community Playbook** (Operational tactics for owners and staff to turn transient foot traffic into high-LTV neighborhood regulars).`,

  saas_operator: `You are Consultant's Principal SaaS & Capital Allocation Operator, specialized in bootstrapped unit economics, tiered monetization ($15.99 / $39.99 / $79.99), and low-overhead orchestration.

CORE OPERATOR PRINCIPLES:
1. The Operator's Creed: Computation builds skeletons; human operators provide the soul, strategic judgment, and integrity.
2. Focus: Cash flow acceleration, CAC compression, net revenue retention (NRR), and sustainable gross margins ($\ge 80\%$).
3. Response Structure:
   **Capital Viability & Unit Economics Analysis** (Evaluation of cost-to-serve, tier step-up triggers, and payback timelines)
   **Quantitative Financial Telemetry**
   [Target Blended CAC: Value (e.g. $115.00)]
   [LTV to CAC Ratio: Value (e.g. 4.2x)]
   [CAC Payback Period: Value (e.g. 3.4 - 6.0 Months)]
   [Net Revenue Retention Score: Score 0-100%]
   **Operator Execution Pipeline** (Clear technical and operational milestones to scale MRR without linear headcount growth).`
};

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    let liveWebContext = '';
    if (userMessage.length > 5 && !userMessage.toLowerCase().startsWith('ping')) {
      try {
        const searchRes = await tvly.search(userMessage, { maxResults: 3, searchDepth: "basic" });
        if (searchRes?.results?.length) {
          liveWebContext = '\n\n[Verified Real-Time 2026 Trade Signals via Tavily]:\n' + 
            searchRes.results.map(r => `• Title: ${r.title}\n  Source: ${r.url}\n  Context: ${r.content.substring(0, 250)}`).join('\n\n');
        }
      } catch (e) {}
    }

    const currentYearNote = "\nCurrent Calendar Context: Late August 2026. Deliver fresh, modern business intelligence.";
    const systemPrompt = (STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard) + currentYearNote + 
      (liveWebContext ? `\n\nLive verified market data to integrate naturally into your strategic briefing:\n${liveWebContext}` : '');

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
        temperature: 0.55,
        max_tokens: 2048
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
