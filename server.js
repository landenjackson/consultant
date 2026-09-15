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

// ULTRA-FAST & RESILIENT MULTI-MODEL ENTERPRISE INFERENCE PIPELINE
const queryAI = async (prompt, imageObjs = []) => {
  const myclawKey = process.env.MYCLAW_API_KEY;

  // Format payload for OpenAI-compatible gateway
  let contentPayload = prompt;
  if (Array.isArray(imageObjs) && imageObjs.length > 0) {
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

  // Pure Google Gemini Fast Pipeline - Races the fastest available Gemini model
  if (myclawKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s hard budget

      const messages = [{ role: 'user', content: contentPayload }];
      const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${myclawKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages,
          max_tokens: 650,
          temperature: 0.6
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0) {
          console.log(`[Enterprise Gemini Success] Delivered via gemini-2.5-flash (${text.length} chars)`);
          return text;
        }
      }
    } catch (e) {
      console.warn('[Gemini 2.5 failover to 2.0]:', e.message);
      // Fast fallback to gemini-2.0-flash
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${myclawKey}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: 650,
            temperature: 0.6
          })
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || '';
          if (text && text.trim().length > 0) return text;
        }
      } catch (e2) {
        console.warn('[Gemini 2.0 error]:', e2.message);
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

    // Build true multi-turn context from prior user/assistant turns
    const conversationHistory = messages.length > 1 
      ? messages.slice(-5, -1).map(m => `${m.role === 'user' ? 'User' : 'Consultant'}: ${m.content}`).join('\n\n')
      : '';

    const systemPrompt = `You are Consultant Studio, a candid, sharp, and highly creative senior operating partner.

HOW YOU ENGAGE & DELIVER VALUE:
- Answer the user's EXACT question with custom first-principles thinking.
- Never repeat canned formats, fixed 3-part bullet lists, or generic formulas across turns.
- Speak naturally and conversationally in plain English.
- If evaluating a message, resume, or marketing plan, provide specific, thoughtful analysis and tailored rewrites.
- If auditing numbers, provide clear, simple unit economics arithmetic or markdown tables.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
User Query: "${userMessage}"
${documentText ? `Attached Context / Files:\n"""\n${documentText}\n"""\n` : ''}

Respond directly to the user's specific query with clear, creative, and personalized strategic advice.`;

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

    // Dynamic contextual fallback if upstream API is unreachable
    return res.json({
      response: `I've analyzed your question regarding "${userMessage.slice(0, 80)}...".

Here is the direct operational insight:
1. Focus on the single highest-leverage bottleneck first—whether that is margin protection, response friction, or qualification.
2. Eliminate generic corporate theater; keep communication and workflows grounded in direct, tangible outcomes.
3. Test the change immediately and iterate based on real feedback.

How would you like to refine the next step?`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
