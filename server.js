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

// High-Speed, Sub-5-Second Concise Executive Prompt Builder
function buildDynamicSystemPrompt(taskType = 'trade_analysis', workspace = 'default', userGoal = '') {
  const task = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;

  return `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

MANDATE: Output a high-density, concise Strategic Advisory Memo in under 5 seconds.
👉 OBJECTIVE: "${userGoal || task.categoryName}"
👉 CATEGORY: ${task.categoryName} (${task.objectiveFocus})
👉 WORKSPACE: ${workspace}

LATENCY & CONCISENESS RULES:
1. PUNCHY & DIRECT: Keep paragraphs to 2 dense sentences. Zero conversational filler, zero corporate poetry.
2. DEDICATED TELEMETRY: Output exactly 6 quantified metrics specific to "${userGoal || task.categoryName}".
3. FAST EXECUTION ROADMAP: 3 numbered action steps.

OUTPUT STRUCTURE:

### Strategic Context & Operational Realities
(2 concise, dense paragraphs analyzing "${userGoal || task.categoryName}".)

### Key Benchmarks & Operational Telemetry
(Provide 6 distinct metrics formatted as:
• [Metric Name]: [Prominent Value] — [1-sentence explanation]
)

### Frontline Execution & Action Roadmap
1. [Action Step 1: Specific operational play & owner]
2. [Action Step 2: Specific operational play & owner]
3. [Action Step 3: Specific operational play & owner]

### Executive Summary & Operator Gate
(1-2 sentence executive takeaway and human sign-off.)`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    const dynamicSystemPrompt = buildDynamicSystemPrompt(taskType || lens, workspace, userMessage);

    // Primary: Google AI Studio Direct API Call (Gemini 2.5 Flash / 1.5 Flash / 3.7 Flash)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const googleAiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        
        const contents = messages
          .filter(m => m.role !== 'system')
          .slice(-4) // Keep context lean for sub-3s latency
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
              maxOutputTokens: 1200 // Caps generation to ~3-4 seconds flat
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
          ...messages.filter(m => m.role !== 'system').slice(-4)
        ],
        temperature: 0.7,
        max_tokens: 1200
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
