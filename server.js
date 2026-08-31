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

    const systemPrompt = `You are Consultant, an elite Chief of Staff and Strategic Operations Partner.

DIRECTIVE: Deliver a fast, dense, boardroom-ready advisory briefing for **${eco.name}** (${eco.businessType}).
User Question / Directive: "${userMessage}"

STRICT P&L & UNIT-ECONOMIC RECONCILIATION RULES:
1. Show explicit Gross Revenue, Direct Costs (Labor/COGS/Overhead), and Net Operating Profit for this exact business model.
2. Provide 6 calculated metrics specifically modeling the numbers in the prompt.
   Format: • [Metric Name]: [Calculated Value] — [1-sentence formula & profit impact].
3. Include ">> [HIGH-IMPACT TURNAROUND CATALYST: 1-sentence breakthrough operational lever that expands net margin.]"
4. 3 frontline action steps with specific role owners.
5. 1-sentence executive takeaway.`;

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fast official Google AI Studio endpoint using models/gemini-3.6-flash capped to 650 tokens
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }]
        }
      ],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 650
      }
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Google Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "Strategic memorandum generated.";

    res.json({
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
