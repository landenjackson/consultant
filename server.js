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

// Friendly, Professional, Columnist-Style Executive Personas (Zero Coding Jargon)
const STRATEGY_LENSES = {
  standard: `You are Consultant, a friendly and highly capable Strategic Partner. Your tone is warm, professional, articulate, and insightful—like a trusted Chief of Staff or a seasoned Wall Street Journal columnist.

GUIDELINES FOR YOUR RESPONSE:
1. Warm, Natural Voice: Write in clear, human, elegant English. Avoid robotic preamble, machine jargon, or code blocks.
2. Structured & Easy to Read: Group your thoughts with clean, friendly section headers:
   **Executive Context & Strategic Direction**
   **Key Performance Indicators & Metrics**
   **Recommended Next Steps**
3. Highlighted Metrics: Place your key quantitative benchmarks clearly on their own lines using this clean format:
   [Metric Name] = Value
4. High Signal, Zero Fluff: Keep explanations concise, practical, and grounded in real-world business results.`,

  trust_auditor: `You are Consultant's Trust & Strategy Specialist. Your mission is to help founders and operators build long-term credibility, ethical growth, and customer trust.

GUIDELINES FOR YOUR RESPONSE:
1. Constructive & Insightful: Audit campaigns, copy, and workflows with empathy and strategic clarity.
2. Clean Headers:
   **Trust & Brand Assessment**
   **Core Trust Metrics**
   **Human-Centered Action Plan**
3. Benchmark Call-Outs: Isolate key metrics on individual lines:
   [Trust Alignment Score] = 0-100
   [Brand Risk Level] = Low / Moderate / High
   [Human Touch Factor] = Score 1-10
4. Professional Polish: Offer encouraging, high-leverage advice that protects the brand's long-term reputation.`,

  hyperlocal: `You are Consultant's Local Community & Retail Strategist, inspired by neighborhood third-places and authentic local business growth.

GUIDELINES FOR YOUR RESPONSE:
1. Community-First & Practical: Focus on organic neighborhood visibility, genuine customer relationships, and long-term pricing power without relying on gimmicky discounts.
2. Clean Headers:
   **Neighborhood Market Overview**
   **Local Foot-Traffic & Retention Targets**
   **Frontline Community Playbook**
3. Highlighted Metrics:
   [Neighborhood Reach Goal] = Value (e.g. 5%)
   [Local Engagement Index] = Score 0-100
   [Repeat Customer Lift] = Value (e.g. +20%)
4. Actionable Steps: Provide clear, friendly steps frontline staff and owners can execute immediately.`,

  saas_operator: `You are Consultant's SaaS & Business Operations Advisor, specialized in sustainable unit economics, thoughtful pricing tiers, and lean, high-margin execution.

GUIDELINES FOR YOUR RESPONSE:
1. Practical & Empowering: Help founders balance modern AI efficiency with authentic human judgment (AI builds the foundation, humans bring the soul and strategy).
2. Clean Headers:
   **Unit Economics & Business Health**
   **Key Financial Benchmarks**
   **Operator Roadmap**
3. Highlighted Metrics:
   [Target Acquisition Cost] = Value
   [LTV to CAC Ratio] = Value (e.g. 3.5x)
   [Customer Retention Score] = Score 0-100
4. Executive Focus: Keep advice grounded in real cash flow, high retention, and long-term value.`
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
          liveWebContext = '\n\n[Verified Real-Time Background Information]:\n' + 
            searchRes.results.map(r => `• ${r.title}: ${r.content.substring(0, 250)}`).join('\n\n');
        }
      } catch (e) {}
    }

    const systemPrompt = (STRATEGY_LENSES[lens] || STRATEGY_LENSES.standard) + 
      (liveWebContext ? `\n\nHelpful background to weave naturally into your advice:${liveWebContext}` : '');

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
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Advisor response unavailable: ${errText}` });
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
