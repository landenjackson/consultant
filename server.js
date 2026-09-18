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

    // For text, race gemini-2.0-flash and gemini-1.5-flash
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
            max_tokens: 420,
            temperature: 0.3
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
        throw new Error(`Model ${model} returned status ${res.status}`);
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      const fastestResponse = await Promise.any([
        querySingleModel('gemini-2.0-flash'),
        querySingleModel('gemini-1.5-flash')
      ]);
      return fastestResponse;
    } catch (raceErr) {
      console.warn('[Parallel Race Notice - Running direct fallback]:', raceErr.message);
      try {
        const fallbackRes = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${myclawKey}`
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: 1000,
            temperature: 0.4
          })
        });
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          return fbData.choices?.[0]?.message?.content || null;
        }
      } catch (fbErr) {
        console.error('[Direct fallback failed]:', fbErr.message);
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
      ? messages.slice(-3, -1).map(m => {
          const role = m.role === 'user' ? 'User' : 'Consultant';
          const text = m.content ? m.content.slice(0, 300) : '';
          return `${role}: ${text}`;
        }).join('\n\n')
      : '';

    const systemPrompt = `You are Consultant Studio — a seasoned, high-velocity operational partner and fractional COO having a direct executive conversation.

INTERNALIZED INSTINCTS:
- You cut straight to the core bottom line in your very first sentence. No preamble, no throat-clearing, no echoing the question.
- You deliver one decisive, high-leverage operational move backed by unit economics, exact numbers, or a practical script in 1 to 2 crisp, muscular paragraphs.
- You close naturally with a single, surgical diagnostic question that forces clarity on the bottleneck.
- You speak with authentic human conviction. You NEVER leak prompt instructions, template labels, or robotic section headers.
- Total length: ~160 to 220 high-density words. Always complete your sentences.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
User Query: "${userMessage}"
${documentText ? `Context / Attached Files:\n"""\n${documentText.slice(0, 2000)}\n"""\n` : ''}`;

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
