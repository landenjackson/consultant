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

// FAST & RESILIENT ENTERPRISE INFERENCE PIPELINE (PARALLEL FAST RACE)
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
    // For vision, route directly to gemini-3.7-flash
    if (hasImages) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${myclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gemini-3.7-flash',
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: 1500,
            temperature: 0.6
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0) return text;
        }
      } catch (err) {
        console.warn('[Vision error]:', err.message);
      }
      return null;
    }

    // For text, race gemini-2.5-flash and gemini-2.0-flash simultaneously to return the fastest response in under 3-4s
    const querySingleModel = async (model) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      try {
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
            max_tokens: 1200,
            temperature: 0.6
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0 && !text.includes('Model do not support image input')) {
            console.log(`[Fast Race Winner: ${model}] (${text.length} chars)`);
            return text;
          }
        }
        throw new Error(`Model ${model} returned non-OK status`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      // Promise.any takes whichever model finishes first
      const fastestResponse = await Promise.any([
        querySingleModel('gemini-2.5-flash'),
        querySingleModel('gemini-2.0-flash')
      ]);
      return fastestResponse;
    } catch (raceErr) {
      console.warn('[Parallel Race Notice - Sequential Fallback to 1.5]:', raceErr.message);
      try {
        return await querySingleModel('gemini-1.5-flash');
      } catch(e) {
        console.error('[Sequential Fallback failed]:', e.message);
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

    const systemPrompt = `You are Consultant Studio — an institutional-grade Turnaround Operating Partner, Fractional Chief Restructuring Officer (CRO), and Private Equity Value Creation engine.

THE 4 CORE RESTRUCTURING PILLARS:
1. 13-WEEK CASH FLOW (TWCF) & LIQUIDITY TRIAGE:
   - Focus on cash in bank, weekly receipts, critical disbursements (payroll, essential vendors, debt service), and zero-cash runway dates.
   - Ignore non-cash accrual noise; enforce hard liquidity floors and working capital conservation.

2. FORENSIC SG&A & MARGIN RATIONALIZATION:
   - Kill vs. Preserve Matrix: Identify unmonitored variable drag, redundant vendor spend, and cash-bleeding business units.
   - Unit Breakeven & Contribution Recalibration: Balance contribution margins down to the exact dollar to satisfy debt covenants.

3. STAKEHOLDER-DEFENSIBLE DELIVERABLES:
   - Structure insights so they translate directly into 1-Page Bank Teasers, DSCR debt coverage bridges, 30/60/90-Day execution milestones, and critical vendor payment agreements.

4. REAL-WORLD ARITHMETIC & SCRIPTS:
   - Provide concrete numbers, percentage trade-offs, and exact 1-sentence scripts for negotiations with lenders, suppliers, and frontline teams.
   - End with 1 or 2 surgical diagnostic questions to probe deeper into working capital constraints.

STYLE:
- Crisp, authoritative, unvarnished financial operator voice.
- 2 to 3 high-impact paragraphs with bold metrics. Zero fluff. Zero generic AI preamble.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
User Query: "${userMessage}"
${documentText ? `Context / Attached Files:\n"""\n${documentText.slice(0, 3000)}\n"""\n` : ''}

Deliver an institutional turnaround advisory response.`;

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
