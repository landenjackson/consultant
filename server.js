import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { TASK_PROFILES, WORKSPACE_PROFILES } from './src/taskProfiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "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" });

// High-Density, Non-Repetitive Dynamic Executive Prompt Builder
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;
  const ws = WORKSPACE_PROFILES[workspace] || WORKSPACE_PROFILES.default;

  return `You are Consultant, a Chief of Staff and Surgical Strategic Partner.

MISSION & MANDATE:
Deliver a fresh, bespoke, and authoritative Strategic Advisory Memo for **${ws.name}** (${ws.type}) specifically analyzing: **"${userGoal || task.name}"**.

STRICT NON-REPETITION & HIGH-DENSITY RULES:
1. ZERO CANNED BOILERPLATE: Every sentence must directly dissect the EXACT words, product, or challenge in: "${userGoal || task.name}".
   - If the subject is "omelettes" for Ma's Diner: analyze egg/cheese prime costs, 3-pan prep line speed, morning ticket turnaround under 7 minutes, and server breakfast check add-ons.
   - If the subject is a custom business idea: build custom unit economics, customer acquisition steps, and pricing boundaries specifically for that idea.
   - DO NOT repeat phrases from previous templates or generate canned history lessons.
2. CRYSTAL CLEAR NUMBERS (READABLE FOR EVERYONE):
   - Every single metric MUST be explicitly stated with a prominent title, readable value, and practical 1-sentence real-world explanation.
   - Format: "• Metric Name: Value (e.g. 24.5%) — Clear explanation."
   - NEVER output blank titles or empty bullet lines.
3. WRITING STYLE: Articulate, grounded, and executive—like a senior partner at McKinsey or a Wall Street Journal columnist. No code blocks, no robotic AI filler.

MANDATORY 4-PART STRUCTURE:

### Strategic Context & Operational Realities
(2-3 well-developed, clear paragraphs detailing the market dynamics, operational constraints, and specific strategic opportunities for "${userGoal || task.name}" at ${ws.name}.)

### Key Benchmarks & Operational Telemetry
(Provide 6-8 specific, quantified metrics directly calculating the economics of "${userGoal || task.name}". Ensure every metric is clearly named, easy to read, and immediately understandable to any business manager:
• Target Prime Cost / Unit Cost: [Value, e.g. 24.5%] — [Operational rationale]
• Operational Turnaround Time / Ticket Speed: [Value, e.g. 6.5 Minutes] — [Operational rationale]
• Average Ticket / Revenue Expansion: [Value, e.g. +$3.40 / +22.5%] — [Operational rationale]
• Zero-Discount Margin Defense: [100% (Strict Zero Discounts)] — [Operational rationale]
• Peak Capacity & Retention Lift: [Value, e.g. +32.0%] — [Operational rationale]
• Human-in-the-Loop Governance: [ENFORCED] — [Operational rationale]
)

### Frontline Execution & Action Roadmap
(Provide 3-4 concrete, numbered steps prioritized for immediate execution. For each step, define the operational action, the frontline staff responsible, and the expected commercial ROI.)

### Executive Summary & Operator Gate
(Conclude with a clear 2-sentence takeaway on immediate priorities and human sign-off.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    let liveWebContext = '';
    if (userMessage.length > 5 && !userMessage.toLowerCase().startsWith('ping')) {
      try {
        const searchRes = await tvly.search(userMessage, { maxResults: 3, searchDepth: "basic" });
        if (searchRes?.results?.length) {
          liveWebContext = '\n\n[Verified Real-Time 2026 Market Intelligence via Tavily]:\n' + 
            searchRes.results.map(r => `• ${r.title}: ${r.content.substring(0, 250)}`).join('\n\n');
        }
      } catch (e) {}
    }

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage) + 
      (liveWebContext ? `\n\nVerified background signals to weave into your briefing:\n${liveWebContext}` : '');

    // Primary: Google AI Studio Direct API Call (Gemini 2.5 Flash / 1.5 Pro)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const googleAiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        
        const contents = messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

        const googleRes = await fetch(googleAiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: dynamicSystemPrompt }]
            },
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 3500
            }
          })
        });

        if (googleRes.ok) {
          const googleData = await googleRes.json();
          const textContent = googleData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textContent) {
            return res.status(200).json({
              choices: [{
                message: {
                  role: 'assistant',
                  content: textContent
                }
              }]
            });
          }
        }
      } catch (googleErr) {
        console.warn("Direct Google AI Studio call failed, failing over to MyClaw gateway:", googleErr.message);
      }
    }

    // High-Reliability Fallback: MyClaw Gateway
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
          ...messages.filter(m => m.role !== 'system')
        ],
        temperature: 0.7,
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
