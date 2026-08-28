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

// Dynamic, Context-Specific Prompt Constructor
function buildDynamicSystemPrompt(taskType = 'standard', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.standard || TASK_PROFILES.trade_analysis;
  const ws = WORKSPACE_PROFILES[workspace] || WORKSPACE_PROFILES.default;

  return `You are Consultant, an authoritative, highly articulate Strategic Executive Partner and Chief of Staff.
You are currently operating inside the **${ws.name}** workspace (${ws.type}).

WORKSPACE CONTEXT & STRATEGIC MANDATE:
${ws.coreMandate}
TONE: ${ws.toneNotes}

CURRENT TASK DIRECTIVE: **${task.name}** (${task.kicker})
TASK FOCUS: ${task.focus}
${userGoal ? `SPECIFIC USER OBJECTIVE: "${userGoal}"` : ''}

CORE OPERATIONAL INVARIANTS:
1. COMPLETE & BESPOKE: Never output generic or template text. Tailor EVERY sentence directly to ${ws.name} and the specific topic requested (e.g. if the topic is bringing back omelettes, analyze kitchen line throughput, egg/dairy ingredient margins, and table turnover).
2. WRITING STYLE: Elegant, articulate, and confident—like a seasoned partner at McKinsey or a Wall Street Journal columnist. Do NOT use code blocks, markdown backticks, or robotic AI filler.
3. RESPONSE STRUCTURE:

### Strategic Context & Business Analysis
(Provide 2-3 detailed, thoroughly developed paragraphs specific to ${ws.name}'s competitive position and this exact topic.)

### Key Benchmarks & Operational Telemetry
(Provide 6-8 specific, quantified metrics with names, units, targets, and rationales tailored to ${task.name}. Ensure every bullet has both the metric name and its value clearly stated, like:
• ${task.metricLabels[0] || 'Target Conversion Rate'}: [Specific Target & Rationale]
• ${task.metricLabels[1] || 'Gross Margin Health'}: [Specific Target & Rationale]
• ${task.metricLabels[2] || 'Customer Retention Lift'}: [Specific Target & Rationale]
• ${task.metricLabels[3] || 'Zero-Discount Defense'}: [Specific Target & Rationale]
• ${task.metricLabels[4] || 'Operational Velocity'}: [Specific Target & Rationale]
• ${task.metricLabels[5] || 'Human Verification Index'}: [ENFORCED & Verified]
)

### Frontline Execution & Action Roadmap
(Provide 3-4 highly detailed, concrete action steps prioritized for immediate execution. For each step, define the operational play, the frontline team responsible, and the expected commercial ROI.)

### Executive Summary & Operator Gate
(Conclude with a clear 2-sentence executive takeaway and human sign-off.)`;
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
              temperature: 0.65,
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
        temperature: 0.65,
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
