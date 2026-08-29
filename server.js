import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { tavily } from '@tavily/core';
import dotenv from 'dotenv';
import { TASK_PROFILES } from './src/taskProfiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "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" });

// Build a 100% Unique, Dynamic Prompt for Each Specific Category & Subject
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

  return `You are Consultant, a Chief of Staff and Senior Partner at an elite management consultancy (McKinsey / BCG standard).

PRIMARY MANDATE:
Deliver a 100% bespoke, highly professional Strategic Advisory Memo addressing the user's exact operational objective:
👉 TARGET OBJECTIVE: "${userGoal || task.categoryName}"
👉 ACTIVE CATEGORY: **${task.categoryName}**
👉 CORE CATEGORY FOCUS: ${task.objectiveFocus}

STRICT PROFESSIONAL EXECUTION RULES:
1. DEEP TOPIC & INDUSTRY ALIGNMENT:
   - Identify the exact business/industry implied in the prompt (e.g., if analyzing a diner, examine restaurant food prime costs, kitchen line turnaround, and table turns; if analyzing Cleaver-Brooks, examine industrial boiler manufacturing, technical workforce retention, and thermal engineering client sales cycles; if analyzing a SaaS or custom business, examine its specific unit economics).
   - DO NOT output generic corporate fluff, canned descriptions, or repetitive boilerplate.
2. CATEGORY-SPECIFIC QUANTITATIVE TELEMETRY:
   - You MUST generate 6 specific, quantified metrics calculated exclusively for this exact business and category.
   - Format every line with a prominent title, value, and real-world explanation:
     • [Metric Title]: [Prominent Value] — [1-sentence operational rationale]
3. TONE & FORMAT:
   - Articulate, authoritative, and boardroom-ready.
   - Structure with clean headers (###), bold highlights, and clean numbered roadmaps.

MANDATORY 4-PART ADVISORY MEMO STRUCTURE:

### Strategic Context & Operational Realities
(2-3 detailed paragraphs specifically dissecting the market dynamics, operational constraints, and commercial realities of "${userGoal || task.categoryName}".)

### Key Benchmarks & Operational Telemetry
(Provide 6 distinct, quantified metrics calculated specifically for this topic and category.)

### Frontline Execution & Action Roadmap
(Provide 3-4 concrete, numbered operational steps prioritized for immediate execution.)

### Executive Summary & Operator Gate
(2-sentence concluding summary with human operator verification sign-off.)`;
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
              temperature: 0.75,
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
        temperature: 0.75,
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
