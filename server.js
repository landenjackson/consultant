import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Stripe Instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

// 1. FAST GEMINI & MULTI-MODEL INFERENCE PIPELINE (WITH MULTIMODAL VISION SUPPORT)
const queryGeminiWithFallback = async (messages, userPrompt, workspaceName, customKey, imageObjs = []) => {
  const googleApiKey = customKey || process.env.GEMINI_API_KEY;
  const activeMyclawKey = process.env.MYCLAW_API_KEY;
  const hasImages = Array.isArray(imageObjs) && imageObjs.length > 0;

  const systemInstruction = `You are Consultant Studio, an objective, approachable, and highly practical strategic advisor.
CONSULTATIVE DIRECTIVES:
- Provide balanced, consumer-centric advice tailored specifically to the user's inquiry without bias or assumptions.
- Avoid all corporate buzzwords and artificial jargon (e.g., avoid "operational telemetry", "remediation paradigm", "friction bottlenecks", "synergy").
- Offer dynamic choices: present 2–3 distinct options with clear pros, cons, and financial considerations so the client can choose the path best suited to their goals.
- Use plain, transparent financial terms (e.g., Sales, Direct Expenses, Net Profit, Cash Cushion).
- Keep responses clean and scannable with clear headings and bulleted action steps.
- Do not append personal names, signatures, or artificial operator sign-offs.

MANDATORY DECISIVE FINISH PROTOCOL:
- If reviewing a RESUME or CAREER: Conclude with 📋 Ready-to-Paste Impact Bullets, 🎙️ 30-Second Elevator Pitch, and 🛡️ Blindspot Solutions.
- If reviewing an INTERVIEW: Conclude with 🎯 60-Second Conviction Script, 🔍 3 Diagnostic Questions, and ⚠️ Hidden Test Alert.
- If reviewing a P&L or STRATEGY: Conclude with 🚦 30-Day Immediate Execution Checklist, 📊 Key Thresholds & Benchmarks, and 📥 Export-Ready Sign-off.`;

  let contentPayload = `Domain/Category: ${workspaceName || 'General Business'}\n\nClient Question:\n${userPrompt}`;
  if (hasImages) {
    contentPayload = [{ type: 'text', text: contentPayload }];
    imageObjs.slice(0, 10).forEach(img => {
      if (img && img.mimeType && img.data) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      }
    });
  }

  // TIER 1: Multimodal Vision Execution (Gemini 3.7 Flash)
  if (hasImages && activeMyclawKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeMyclawKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gemini-3.7-flash',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: contentPayload }
          ],
          max_tokens: 4096,
          temperature: 0.2
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0 && !text.includes('Model do not support image input')) {
          return text;
        }
      }
    } catch (vErr) {
      console.warn('[Vision request error]:', vErr.message);
    }
  }

  // TIER 2: Direct Google AI Studio API (if valid key provided)
  if (googleApiKey && googleApiKey.startsWith('AIzaSy') && !hasImages) {
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s circuit breaker

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${googleApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: `Domain/Category: ${workspaceName || 'General Business'}\n\nClient Question:\n${userPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 4096
            }
          })
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
          if (text && text.trim().length > 0) {
            return text;
          }
        } else {
          const errBody = await res.text();
          console.warn(`[Inference Warning] ${modelName} (${res.status}): ${errBody.substring(0, 150)}`);
        }
      } catch (err) {
        console.warn(`[Inference Error] ${modelName} failed:`, err.message);
      }
    }
  }

  // TIER 3: Parallel High-Velocity Gateway Race (sub-4s fast execution)
  if (activeMyclawKey && !hasImages) {
    const fetchModel = async (modelName) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeMyclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: contentPayload }
            ],
            max_tokens: 4096,
            temperature: 0.2
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0) return text;
        }
        throw new Error(`${modelName} status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const winnerText = await Promise.any([
        fetchModel('gemini-2.0-flash'),
        fetchModel('gemini-3.7-flash'),
        fetchModel('gpt-4o-mini')
      ]);
      if (winnerText) return winnerText;
    } catch (raceErr) {
      console.warn('[Parallel race failed]:', raceErr.message);
    }
  }

  return null;
};

// 2. DYNAMIC, UNBIASED CONSULTATIVE FALLBACK
const generateDynamicConsultativeResponse = (inquiry, workspace) => {
  return `### Strategic Consultation: "${inquiry}"

Here is an objective overview with practical paths forward to consider:

#### Option A: Maximize Revenue per Customer
* **Strategy:** Enhance product/service packaging, introduce premium tiers, or bundle complementary offerings.
* **Financial Impact:** Targets a 5% to 15% increase in average ticket size without taking on additional payroll or overhead.
* **Ideal When:** Your customer volume is healthy and you want to increase gross margin.

#### Option B: Streamline Operational Expenses
* **Strategy:** Audit vendor rates, eliminate unused software or subscriptions, and tighten weekly supply purchasing.
* **Financial Impact:** Typically reduces monthly operating overhead by 8% to 12%, immediately preserving cash flow.
* **Ideal When:** Rising supplier costs or tight operating margins require defensive cash management.

---

🚦 **Immediate 3-Step Action Plan:**
1. **Audit Top Expenses:** List your 5 largest vendor bills from the last 30 days and evaluate potential savings.
2. **Review Pricing:** Check that current rates account for any recent cost-of-goods increases.
3. **Weekly Financial Rhythm:** Review gross sales and direct costs every Monday morning for consistent cash visibility.

📥 **Export-Ready Sign-off:**
Strategic baseline established. You can export this overview directly into Excel (.xlsx) or Word (.docx) for team alignment.`;
};

// 3. STRIPE CHECKOUT SESSION
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId = 'pro', tier = 'Pro Plan', amount = 3999 } = req.body;
    const origin = req.headers.origin || 'https://www.consultant-studio.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Consultant Studio — ${tier}`,
            description: 'Executive Operations & Strategy Workspace'
          },
          unit_amount: amount,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      subscription_data: { trial_period_days: 30 },
      mode: 'subscription',
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&subscribed=true`,
      cancel_url: `${origin}/?canceled=true`
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. UNIFIED FAST CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'default', documentText = '', conversationId = null } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

    if (!userMessage) {
      return res.status(400).json({ error: 'Please enter a question or business topic.' });
    }

    const customKey = req.headers['x-custom-gemini-key'] || null;

    // Extract all embedded base64 image data if attached
    let imageObjs = [];
    if (documentText && documentText.includes('data:image/')) {
      const regex = /data:(image\/[a-zA-Z0-9\+\-\.]+);base64,([^\s\]]+)/g;
      let match;
      while ((match = regex.exec(documentText)) !== null && imageObjs.length < 10) {
        imageObjs.push({
          mimeType: match[1],
          data: match[2]
        });
      }
    }

    const fullPrompt = documentText
      ? `[Document Context]:\n${documentText.slice(0, 25000)}\n\n[Question]:\n${userMessage}`
      : userMessage;

    const liveResponse = await queryGeminiWithFallback(messages, fullPrompt, workspace, customKey, imageObjs);
    if (liveResponse) {
      return res.json({
        response: liveResponse,
        conversationId: conversationId || `ax_${Date.now()}`,
        isFallback: false
      });
    }

    const fallbackResponse = generateDynamicConsultativeResponse(userMessage, workspace);
    return res.json({
      response: fallbackResponse,
      conversationId: conversationId || `ax_${Date.now()}`,
      isFallback: true
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    const fallback = generateDynamicConsultativeResponse(req.body?.messages?.[0]?.content || 'Business Review', req.body?.workspace || 'default');
    res.json({ response: fallback, isFallback: true });
  }
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Consultant Studio running on port ${PORT}`);
});
