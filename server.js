import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Email Transporter (SMTP / Resend / Ethereal Fallback)
const createEmailTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'custom', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;

    const apiKey = process.env.GEMINI_API_KEY;

    const systemPrompt = `You are an experienced, trusted Senior Business Consultant and Chief of Staff speaking 1-on-1 directly with a business owner.

VOICE & TONE:
- Talk directly TO the business owner like a real human partner sitting across from them.
- Be direct, practical, and conversational. No textbook definitions, no generic industry trivia, no robotic boilerplate.
- Talk about their specific business, products, staff, and cash flow.
- Explain where they are leaving money on the table and how to fix it step-by-step.

RESPONSE FORMAT:

### 1. Executive Diagnosis & Direct Advice
(2 direct paragraphs addressing the owner's exact situation and explaining the solution.)

>> ★ Key Turnaround Move: [1 clear, uncompromised sentence with the single highest-impact action the owner should take first.]

### 2. The Real Numbers (Daily Cash Flow & Unit Economics)
• Metric 1: Value — Plain-English explanation of the math and profit impact.
• Metric 2: Value — Plain-English explanation.
• Metric 3: Value — Plain-English explanation.
• Metric 4: Value — Plain-English explanation.
• Metric 5: Value — Plain-English explanation.

### 3. Step-by-Step Execution Plan
1. Days 1–30 (Immediate Fix): [Action & assigned Role Owner]
2. Days 31–60 (System Upgrade): [Action & assigned Role Owner]
3. Days 61–90 (Profit Lock): [Action & assigned Role Owner]

### 4. Direct Bottom-Line Takeaway
(1 direct, encouraging concluding sentence.)`;

    const userPrompt = `Client Business: ${eco.name} (${eco.businessType})
Owner's Question & Goal: "${userMessage}"

Give me your direct strategic advisory memo based on this situation:`;

    // Multi-Model Cascade: Primary Gemini 3.8 Flash with automatic fallback to Gemini 3.5 / 2.5
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
    let content = null;
    let lastError = null;

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.65, maxOutputTokens: 1200 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.find(p => p.text)?.text;
          if (textPart) {
            content = textPart;
            break; // Success!
          }
        } else {
          lastError = `Model ${model} returned ${response.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!content) {
      return res.status(503).json({ error: `AI inference temporarily unavailable: ${lastError}` });
    }

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

// Dedicated Email Dispatch Endpoint
app.post('/api/dispatch-email', async (req, res) => {
  try {
    const { to, workspace = "Ma's Diner", title = "Morning Executive Strategic Briefing", memoContent } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: "A valid recipient email address is required." });
    }

    const transporter = await createEmailTransporter();

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090A0C; color: #E2E8F0; padding: 24px; margin: 0; }
        .email-container { max-width: 600px; margin: 0 auto; background: #0F1216; border: 1px solid #1C2028; border-radius: 10px; overflow: hidden; }
        .email-header { background: #161A22; border-bottom: 1px solid #1C2028; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; }
        .logo-text { font-size: 15px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em; }
        .jade-badge { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.35); color: #4ADE80; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
        .email-body { padding: 24px; font-size: 14px; line-height: 1.6; color: #CBD5E1; }
        .memo-title { font-size: 18px; font-weight: 800; color: #FFFFFF; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #1C2028; padding-bottom: 12px; }
        .email-footer { background: #0C0E12; border-top: 1px solid #1C2028; padding: 16px 24px; font-size: 11.5px; color: #64748B; text-align: center; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="logo-text">✦ CONSULTANT STUDIO</div>
          <div class="jade-badge">Executive Dispatch • ${workspace}</div>
        </div>
        <div class="email-body">
          <h2 class="memo-title">${title}</h2>
          <div style="white-space: pre-wrap; font-family: inherit;">${memoContent || "No memo content provided."}</div>
        </div>
        <div class="email-footer">
          Delivered autonomously via Consultant Studio Orchestrated Engine • <a href="https://consultant-studio.ai.studio" style="color:#4ADE80; text-decoration:none;">Launch Dashboard</a>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: `"Consultant Studio" <${process.env.SMTP_FROM || 'briefings@consultant-app.com'}>`,
      to: to,
      subject: `📊 ${workspace}: ${title}`,
      text: memoContent,
      html: htmlBody
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return res.json({
      success: true,
      messageId: info.messageId,
      recipient: to,
      previewUrl: previewUrl || null
    });

  } catch (err) {
    console.error('Email dispatch error:', err);
    return res.status(500).json({ error: err.message || "Failed to dispatch email." });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
