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

    const apiKey = process.env.GEMINI_API_KEY;

    const promptText = `You are a trusted Senior Business Consultant and Chief of Staff speaking 1-on-1 directly with a business owner.

CRITICAL VOICE & MINDSET RULE:
- Talk TO the owner like a real human partner sitting across the table, not an AI summarizing general industry trivia.
- NEVER talk about auto shops, cars, or mechanics unless the user explicitly asks about auto repair.
- If the user is asking about Ma's Diner, a restaurant, a clinic, a gym, or any specific business, address THAT exact business with personal, conversational, and direct guidance ("Here is what we need to fix in your operation...").
- Drop the academic "textbook" lecturing. Tell them where they are losing money today, how to fix it, and how much cash it puts in their pocket.

User's Specific Situation & Goal:
"${userMessage}"

Active Client Context: ${eco.name} (${eco.businessType})

STRUCTURE YOUR ADVICE IN THIS CLEAN 4-PART FORMAT:

### 1. Executive Diagnosis & Direct Advice
(Speak directly to the owner. Diagnose their specific bottleneck, explain why it is happening in their business, and give them a clear, practical solution in plain English.)

>> ★ Key Turnaround Move: [1 clear, uncompromised sentence with the single highest-impact action you want the owner to take first.]

### 2. The Real Numbers (Daily Cash Flow & Unit Economics)
(Give 5 clear metrics showing the actual revenue vs. cost math for this specific business:
• Metric Name: Value — Plain-English explanation of the math and why it matters to your take-home profit.
• Metric Name: Value — Plain-English explanation.
• Metric Name: Value — Plain-English explanation.
• Metric Name: Value — Plain-English explanation.
• Metric Name: Value — Plain-English explanation.
)

### 3. Step-by-Step Execution Plan
1. Days 1–30 (Immediate Fix): [What you and your team need to execute first, with who owns it]
2. Days 31–60 (System & Pricing Upgrade): [The process or pricing change to make next]
3. Days 61–90 (Profit Lock): [The long-term habit or system to lock in higher margins]

### 4. Direct Bottom-Line Takeaway
(1 encouraging, direct concluding sentence from you as their advisor.)`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 1200 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Google AI Studio API (${response.status}): ${errText}` });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
    const content = textPart || "Strategic memo generated.";

    return res.json({
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
