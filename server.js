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

// FAST & HAWK-SPEED ENTERPRISE GEMINI INFERENCE PIPELINE
const queryAI = async (prompt, imageObjs = []) => {
  const myclawKey = process.env.MYCLAW_API_KEY;
  const hasImages = Array.isArray(imageObjs) && imageObjs.length > 0;

  let contentPayload = prompt;
  if (hasImages) {
    contentPayload = [{ type: 'text', text: prompt }];
    imageObjs.slice(0, 10).forEach(img => {
      if (img && img.mimeType && img.data) {
        contentPayload.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      }
    });
  }

  if (myclawKey) {
    const models = hasImages
      ? ['gemini-3.7-flash']
      : ['gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // Fast 12s socket budget

        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${myclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: 550, // Ultra-compact token budget for fastest delivery
            temperature: 0.55
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0 && !text.includes('Model do not support image input')) {
            console.log(`[Enterprise Gemini Success] Delivered via ${model} (${text.length} chars)`);
            return text;
          }
        }
      } catch (err) {
        console.warn(`[Failover from ${model}]:`, err.message);
      }
    }
  }

  return null;
};

// 1. DYNAMIC STRIPE CHECKOUT SESSIONS
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId = 'pro', tier = 'Pro Operator', amount = 3999 } = req.body;
    const origin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://www.consultant-studio.app');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Consultant Studio — ${tier}`,
            description: 'Executive Operations & Strategic Intelligence Suite (30-Day Free Trial)'
          },
          unit_amount: amount,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30
      },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&subscribed=true`,
      cancel_url: `${origin}/?canceled=true`
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. UNIFIED STRATEGIC CHAT ENDPOINT (100% GENUINE HUMAN-IN-THE-LOOP DIALOGUE)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], workspace = 'general', documentText = '' } = req.body;
    const userMessage = messages.length > 0 ? messages[messages.length - 1].content : '';

    if (!userMessage) {
      return res.status(400).json({ error: "Empty prompt provided." });
    }

    // Sanitize conversation history: truncate long prior assistant responses to prevent token overload
    const conversationHistory = messages.length > 1
      ? messages.slice(-5, -1).map(m => {
          const role = m.role === 'user' ? 'User' : 'Consultant';
          const text = m.content ? m.content.slice(0, 600) : '';
          return `${role}: ${text}`;
        }).join('\n\n')
      : '';

    const systemPrompt = `You are Consultant Studio — an elite, battle-tested business operating partner having a candid conversation with a founder or operator.

THE 4 RULES OF HIGH-CORRELATION CONSULTATIVE INTELLIGENCE:
1. ANCHOR & MIRROR EXACT CONTEXT:
   - Anchor immediately on the exact details, names, numbers, or constraints given in the user query.
   - Speak directly to their specific business reality instead of giving broad industry generalities.

2. INDUSTRY-SPECIFIC UNIT PHYSICS:
   - Use the exact technical vocabulary and unit economics native to their domain:
     * Food Service/Diners: Hourly sales bands, prime cost ceilings (62%), covers per hour, table turn compression, protein variance cycle counts.
     * Telecom/Retail: Frontline store throughput, quota pacing, ARPU defense, 99% fulfillment SLAs, trade-in conversions.
     * B2B Outreach/Agencies: Event-based triggers, deliverability infrastructure (SPF/DKIM/DMARC), human-in-the-loop agent guardrails, CAC payback.
     * Healthcare: Patient throughput, staffing nurse-to-bed ratios, denial rate compression.

3. "CUT VS. SCALE" TRADE-OFF PAIRS:
   - Always tell the operator what to STOP or CUT (e.g. killing 30% discount coupons, eliminating unearned downtime) before telling them what to scale.

4. EXACT VERBAL SCRIPTS OVER VAGUE ADVICE:
   - When recommending staff, sales, or customer communication, provide the exact 1-2 sentence script they can say aloud tomorrow morning.

STYLE & PACE:
- Answer directly in 2 to 3 punchy, high-impact paragraphs.
- Zero robotic section headers (no "The Diagnostic", "The Playbook", "7 Levers").
- Conversational, authoritative, and focused entirely on the user's scenario.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
User Query: "${userMessage}"
${documentText ? `Context / Attached Files:\n"""\n${documentText.slice(0, 3000)}\n"""\n` : ''}

Deliver a tightly correlated, natural consultative response.`;

    // Extract all embedded base64 image data if attached (Up to 10 images)
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

    console.log(`[Executing Live Inference for User Query | Multimodal Images: ${imageObjs.length}]`);
    const liveResponse = await queryAI(systemPrompt, imageObjs);

    if (liveResponse) {
      return res.json({ response: liveResponse });
    }

    return res.status(503).json({ error: "Inference engine momentarily busy. Please resend." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
