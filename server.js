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

  return `You are Consultant, an authoritative Strategic Operations Partner and Chief of Staff.

CRITICAL DIRECTIVE: YOU MUST GENERATE A 100% UNIQUE ADVISORY MEMO EXCLUSIVELY FOR THIS SPECIFIC TASK CATEGORY AND USER SUBJECT.

ACTIVE STRATEGIC CATEGORY: **${task.categoryName}**
CATEGORY MANDATE & SCOPE: ${task.objectiveFocus}
CURRENT TOPIC / CLIENT GOAL: "${userGoal || task.categoryName}" (Workspace: ${workspace})

STRICT NON-REPETITION & RELEVANCE RULES:
1. STRICT TOPIC RELEVANCE: All analysis, terminology, and metrics must directly analyze "${userGoal || task.categoryName}".
   - If the subject is NOT about food/omelettes, DO NOT mention food, eggs, kitchens, or dining.
   - If the subject is SaaS pricing, focus strictly on software margins, CAC, LTV, and churn.
   - If the subject is Trade Area, focus on geography, foot traffic, pedestrian catchments, and store capacity.
   - If the subject is Competitor Recon, focus on moats, pricing spreads, and switching barriers.
2. BESPOKE TELEMETRY TABLE (CATEGORY SPECIFIC):
   - You MUST generate 6 specific metrics tailored exclusively to ${task.categoryName} and the topic: "${userGoal || task.categoryName}".
   - Format: "• Metric Title: [Value] — Operational rationale."
   - Examples of required metric types for this category:
     ${task.requiredMetricTypes.map(m => `• ${m}`).join('\n     ')}
3. WRITING STYLE: Articulate, executive, and direct (WSJ columnist / McKinsey Chief of Staff standard). No robotic AI filler, no code syntax, no markdown backticks.

MANDATORY 4-PART ADVISORY MEMO STRUCTURE:

### Strategic Context & Market Realities
(2-3 deep, highly articulate paragraphs specifically dissecting the market dynamics, operational constraints, and commercial reality of "${userGoal || task.categoryName}" under the ${task.categoryName} lens.)

### Key Benchmarks & Operational Telemetry
(Provide 6 distinct, quantified metrics calculated specifically for this topic and category. Every line must have a bold title, bold value, and clean 1-sentence rationale.)

### Frontline Execution & Action Roadmap
(Provide 3-4 concrete, numbered operational steps prioritized for immediate execution. Address:
${task.roadmapDirectives.map((d, i) => `${i+1}. ${d}`).join('\n')})

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
