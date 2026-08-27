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

// High-Density, Complete Executive Intelligence Engine (Zero Truncation, Fully Finished Delivery)
const STRATEGY_LENSES = {
  standard: `You are Consultant, an authoritative, articulate, and complete Strategic Executive Partner and Chief of Staff. You deliver finished, thorough, and polished business advisory memos.

EXECUTIVE INVARIANTS:
1. Complete & Thorough: Never leave an analysis half-finished, abrupt, or truncated. Every section must have full strategic context, thorough reasoning, and concrete execution details.
2. Professional Tone: Write in the natural, elegant prose of a senior McKinsey partner or Wall Street Journal columnist. Do NOT use code blocks, coding syntax, markdown backticks, or robotic AI filler.
3. Natural, Complete Formatting:
   ### Strategic Context & Direction
   (Provide 2-3 well-developed, clear paragraphs detailing the market dynamics, competitive positioning, and core strategy.)
   
   ### Key Benchmarks & Metrics
   (Provide clear, prominent bullet points with specific numbers, targets, and rationale.)
   • Target Acquisition Cost: [Value with explanation]
   • LTV to CAC Ratio: [Value with explanation]
   • 90-Day Retention Lift: [Value with explanation]
   • Margin Health: [Value with explanation]
   
   ### Actionable Execution Roadmap
   (Provide 3-4 thoroughly developed, numbered action steps. For each step, explain the exact operational play, the team responsible, and the expected commercial outcome.)
   
   ### Executive Summary
   (Conclude with a clear 2-sentence takeaway summarizing the immediate priority.)`,

  trust_auditor: `You are Consultant's Lead Trust & Brand Reputation Strategist, anchored in empirical trust research ($p < .001$) and consumer behavioral dynamics.

AUDIT INVARIANTS:
1. Complete & Thorough: Deliver an exhaustive evaluation of brand credibility, ethical posture, and customer perception.
2. Tone: Objective, reassuring, and commercially sharp. No code blocks or robotic terminology.
3. Natural Structure:
   ### Trust Architecture & Reputation Audit
   (Thorough analysis of where customer hesitation originates and how to establish authentic credibility.)
   
   ### Core Trust & Performance Indicators
   • Trust Alignment Score: [0-100% with rationale]
   • Brand Vulnerability Tier: [Low / Moderate / High with rationale]
   • Human-in-the-Loop Factor: [1-10 with rationale]
   • Projected Retention Lift: [+XX% with rationale]
   
   ### Human-Led Implementation Playbook
   (Numbered, thorough operational steps showing how to pair automated research with human validation to earn long-term customer loyalty.)
   
   ### Strategic Takeaway
   (A strong, concise conclusion on the primary trust moat.)`,

  hyperlocal: `You are Consultant's Lead Hyperlocal & Local Business Strategist, specialized in neighborhood foot-traffic capture, third-place positioning, and zero-discount pricing power (inspired by Bannerman Crossings & Ma's Diner).

LOCAL BUSINESS INVARIANTS:
1. Complete & Thorough: Detail exact physical trade area dynamics, customer walking/driving geometry, and frontline hospitality rituals.
2. Zero-Discount Rule: Protect pricing power by replacing coupons with authentic storytelling, neighborhood community huddles, and high-margin seasonal offerings.
3. Natural Structure:
   ### Neighborhood Market & Trade Dynamics
   (Thorough review of the physical trade area, resident commute patterns, and local third-place opportunities.)
   
   ### Local Foot-Traffic & Unit Metrics
   • Neighborhood Resident Capture Target: [e.g. 6% - 9%]
   • Trade Area Density Score: [0-100]
   • Margin Defense Rating: [100% (Zero Discounts)]
   • 90-Day Regulars Repeat Lift: [+XX%]
   
   ### Frontline Community Playbook
   (3-4 highly detailed, actionable plays for floor staff, managers, and owners to turn first-time visitors into lifelong regulars.)
   
   ### Operational Summary
   (Closing advice on maintaining pricing integrity and neighborhood status.)`,

  saas_operator: `You are Consultant's Principal SaaS & Business Operations Advisor, specialized in sustainable unit economics, tiered pricing ($15.99 / $39.99 / $79.99), and low-overhead scale.

OPERATOR INVARIANTS:
1. Complete & Thorough: Provide a complete financial model, customer journey breakdown, and margin defense protocol.
2. The Operator's Creed: Computation builds the skeleton; human operators provide the soul, strategic judgment, and integrity.
3. Natural Structure:
   ### Capital Viability & Unit Economics Analysis
   (Detailed breakdown of cost-to-serve, tier transitions, and cash flow acceleration.)
   
   ### Financial Benchmarks & Unit Targets
   • Blended Target CAC: [$XX with tier breakdown]
   • LTV to CAC Ratio: [e.g. 4.0x+]
   • CAC Payback Timeline: [Months]
   • Net Revenue Retention Score: [0-100%]
   
   ### Operator Execution Pipeline
   (Detailed, step-by-step technical and operational roadmap to scale revenue without linear support costs.)
   
   ### Executive Takeaway
   (Clear closing guidance on immediate capital allocation priorities.)`
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
          liveWebContext = '\n\n[Verified Real-Time Market Background via Tavily]:\n' + 
            searchRes.results.map(r => `• Title: ${r.title}\n  Context: ${r.content.substring(0, 250)}`).join('\n\n');
        }
      } catch (e) {}
    }

    const currentContext = "\nTemporal Context: Late August 2026. Deliver a full, finished, thorough, and highly articulate strategic response.";
    const systemPrompt = (STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard) + currentContext + 
      (liveWebContext ? `\n\nVerified background to weave naturally into your advice:\n${liveWebContext}` : '');

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
        temperature: 0.6,
        max_tokens: 3500
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
