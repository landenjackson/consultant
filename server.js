import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { ApifyClient } from 'apify-client';
import { WORKSPACE_ECONOMIC_MODELS } from './src/workspaceEconomics.js';
import { TASK_PROFILES } from './src/taskProfiles.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const apifyClient = process.env.APIFY_API_KEY ? new ApifyClient({ token: process.env.APIFY_API_KEY }) : null;

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

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tier = 'starter', priceId } = req.body;
    if (!stripe) return res.status(500).json({ error: "Stripe is not configured." });

    const domain = req.headers.origin || 'https://consultant-studio.ai.studio';
    const tierConfig = {
      starter: { name: 'Consultant Studio — Starter Plan', amount: 1599, desc: 'Independent operators & small diners' },
      pro: { name: 'Consultant Studio — Pro Strategy', amount: 3999, desc: 'Growing multi-unit operators & clinics' },
      executive: { name: 'Consultant Studio — Executive Suite', amount: 7999, desc: 'Commercial developers, industrial & agencies' }
    };
    const selected = tierConfig[tier] || tierConfig.starter;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      automatic_tax: { enabled: true },
      line_items: [
        priceId ? { price: priceId, quantity: 1 } : {
          price_data: {
            currency: 'usd',
            tax_behavior: 'exclusive',
            product_data: {
              name: selected.name,
              description: selected.desc,
              tax_code: 'txcd_10000000',
              images: ['https://consultant-studio.ai.studio/icon.svg']
            },
            unit_amount: selected.amount,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: { trial_period_days: 30 },
      success_url: `${domain}/?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${domain}/?status=cancelled`
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session error:', err);
    return res.status(500).json({ error: err.message || "Failed to create checkout session." });
  }
});

app.post('/api/dispatch-webhook', async (req, res) => {
  try {
    const { platform = 'discord', webhookUrl, workspace = "Ma's Diner", title = "Morning Executive Strategic Briefing", memoContent } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('http')) return res.status(400).json({ error: "Valid webhook URL required." });

    let payload = {};
    if (platform === 'discord') {
      payload = {
        username: "Consultant Studio",
        avatar_url: "https://consultant-studio.ai.studio/favicon.svg",
        embeds: [{
          title: `📊 ${workspace}: ${title}`,
          description: (memoContent || "Strategic brief ready.").substring(0, 2000),
          color: 0x22c55e,
          footer: { text: "Delivered via Consultant Studio Engine" },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (platform === 'slack') {
      payload = { text: `*📊 ${workspace} — ${title}*\n\n${memoContent}\n\n_Delivered via Consultant Studio_` };
    } else {
      payload = { workspace, title, memoContent, timestamp: new Date().toISOString() };
    }

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) return res.status(resp.status).json({ error: "Webhook post failed" });
    return res.json({ success: true, platform, status: "Delivered" });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apify-recon', async (req, res) => {
  try {
    const { query, location = "Tallahassee, FL", actor = "compass/crawler-google-places" } = req.body;
    if (!apifyClient) {
      return res.json({
        live: false,
        source: "Empirical Spatial Cache",
        data: {
          location,
          searchQuery: query || "Local Catchment",
          competitorCount: 14,
          averageRating: 4.6,
          footfallIndex: "High Density (8.4/10)",
          peakHours: "7:15 AM - 9:30 AM",
          estimatedWalkshedCapture: "6.8%"
        }
      });
    }

    const run = await apifyClient.actor(actor).call({
      searchStringsArray: [query || `${location} businesses`],
      maxCrawledPlacesPerSearch: 10,
      language: "en"
    });
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems({ limit: 10 });
    return res.json({ live: true, source: "Apify Live Cloud Actor", datasetId: run.defaultDatasetId, items });
  } catch (err) {
    console.error('Apify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DYNAMIC 100% TOPIC-CORRELATED CHAT ENDPOINT (GEMINI 3.5 FLASH LITE FAST LANE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, lens = 'standard', taskType = 'trade_analysis', workspace = 'default' } = req.body;
    const userMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const eco = WORKSPACE_ECONOMIC_MODELS[workspace] || WORKSPACE_ECONOMIC_MODELS.default;
    const profile = TASK_PROFILES[taskType] || TASK_PROFILES.trade_analysis;
    const apiKey = process.env.GEMINI_API_KEY;

    const promptText = `You are Consultant Studio, an elite Senior Strategic Operations Partner and Chief of Staff speaking 1-on-1 directly with a business owner.

CRITICAL DIRECTIVE ON STRICT TOPIC & QUESTION DIFFERENTIATION:
1. FOCUS 100% ON THIS EXACT USER QUESTION: "${userMessage}"
2. ACTIVE BUSINESS CONTEXT: ${eco.name} (${eco.businessType})
3. DOMAIN FOCUS: ${profile.categoryName}
4. DO NOT OUTPUT CANNED REPEATED TEMPLATES. Calculate the specific financial math tailored directly to what was asked.

FORMAT:
### 1. ${profile.categoryName} — Operational Reality: "${userMessage.substring(0, 60)}"
(2 dense, analytical paragraphs analyzing the exact problem or inquiry submitted by the owner.)

>> ★ Key Turnaround Move: [1 single, high-leverage tactical action directly answering the user's prompt.]

### 2. Verified Financial Telemetry & Daily P&L Math (${eco.name})
(5 custom metrics directly calculating the math for this specific question with explicit formulas:
• Metric 1: Value — Plain-English explanation.
• Metric 2: Value — Plain-English explanation.
• Metric 3: Value — Plain-English explanation.
• Metric 4: Value — Plain-English explanation.
• Metric 5: Value — Plain-English explanation.
)
• What-If Annual Cash Flow Recovery: +$XX,XXX/yr — Plain-English explanation.

### 3. Frontline Operational Action Plan (Today's Priorities)
1. Priority 1 (Immediate Margin Defense): [Action & assigned Role Owner]
2. Priority 2 (Process & Labor Optimization): [Action & assigned Role Owner]
3. Priority 3 (Zero-Discount Customer Retention): [Action & assigned Role Owner]

### 4. Direct Bottom-Line Takeaway & Operator Gate
(1 direct, encouraging closing sentence answering the owner's core question.)
Status: Cleared for Production Execution • Landen Jackson (Lead Strategic Operator)`;

    let content = null;
    const activeModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];

    for (const m of activeModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      try {
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 750
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
          if (textPart) {
            content = textPart;
            break;
          }
        }
      } catch (err) {
        console.error(`Model ${m} call error:`, err);
      }
    }

    if (!content) {
      return res.status(503).json({ error: "Inference engine busy. Please retry." });
    }

    return res.json({
      choices: [{ message: { role: "assistant", content } }]
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Dedicated Email Dispatch Endpoint
app.post('/api/dispatch-email', async (req, res) => {
  try {
    const { to, workspace = "Ma's Diner", title = "Morning Executive Strategic Briefing", memoContent } = req.body;
    if (!to || !to.includes('@')) return res.status(400).json({ error: "Valid email required." });

    const transporter = await createEmailTransporter();
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:sans-serif; background:#090A0C; color:#E2E8F0; padding:24px;">
      <div style="max-width:600px; margin:0 auto; background:#0F1216; border:1px solid #1C2028; border-radius:8px; padding:20px;">
        <h2 style="color:#FFF; margin-top:0;">📊 ${workspace}: ${title}</h2>
        <div style="white-space:pre-wrap; line-height:1.6; color:#CBD5E1;">${memoContent}</div>
      </div>
    </body>
    </html>`;

    const info = await transporter.sendMail({
      from: `"Consultant Studio" <${process.env.SMTP_FROM || 'briefings@consultant-app.com'}>`,
      to,
      subject: `📊 ${workspace}: ${title}`,
      text: memoContent,
      html: htmlBody
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Consultant Studio backend running on port ${PORT}`);
});
