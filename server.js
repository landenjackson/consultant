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

const TYPESAFE_API_KEY = process.env.TYPESAFE_API_KEY || '«redacted:apikey_28701d1ef1a950e4010af1b3b6c8d5c3203_2ca8fdc9c2dbec871f7084338acbaa89381dcdaff5fb735b4b5111c13b305b7f»';

// TYPESAFE JEV SYSTEM ONE MULTI-PRIMITIVE EVALUATOR (~150ms DECISION ENGINE)
const evaluateWithJev = async (userText) => {
  if (!TYPESAFE_API_KEY) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TYPESAFE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        state: String(userText || '').slice(0, 1000),
        model: 'jev-latest',
        questions: {
          intent: {
            type: 'choice',
            instructions: 'What is the primary operational domain of this request?',
            criteria: {
              career: 'Resumes, job applications, interview prep, career reframing',
              finance: 'P&L audits, cash flow waterfalls, unit economics, debt covenants, margin leaks',
              growth: 'Local SEO, foot-traffic, customer acquisition, marketing campaigns',
              operations: 'Kitchen/floor workflow, team scheduling, logistics, general business strategy'
            }
          },
          urgency: {
            type: 'score',
            instructions: 'How urgent or high-stakes is this operational situation?',
            criteria: ['Routine query or exploratory question', 'Moderate pressure or active bottleneck', 'Critical cash crunch, immediate deadline, or turnaround emergency']
          },
          needs_math: {
            type: 'noul',
            instructions: 'Does this request involve numbers, pricing, margins, or financial calculations?'
          },
          tone_archetype: {
            type: 'choice',
            instructions: 'What consulting tone best serves this specific situation?',
            criteria: {
              peer_coo: 'Direct, unvarnished peer executive giving clear math and strategic trade-offs',
              tactical_coach: 'Encouraging, grounded operator giving step-by-step frontline actions',
              career_strategist: 'Sharp executive recruiter focusing on quantifiable business outcomes and credibility'
            }
          }
        }
      })
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const answers = data.answers || {};
      const intent = answers.intent?.choice || 'operations';
      const urgencyScore = answers.urgency?.score || 0;
      const needsMath = (answers.needs_math?.noul || 0) > 0.45;
      const tone = answers.tone_archetype?.choice || 'peer_coo';
      console.log(`[TypeSafe Jev Evaluator] Domain: ${intent} | Urgency: ${urgencyScore.toFixed(2)} | Math: ${needsMath} | Tone: ${tone}`);
      return {
        domain: intent,
        urgency: urgencyScore,
        needsMath,
        tone
      };
    } else {
      const errText = await res.text();
      console.error(`[TypeSafe Jev Error ${res.status}]:`, errText);
    }
  } catch (err) {
    console.error('[TypeSafe Jev Fetch Exception]:', err.message);
  }
  return null;
};

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

    // Direct single high-reliability query to gemini-2.0-flash with calibrated token budget for fast execution
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
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
          max_tokens: 500,
          temperature: 0.2
        })
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0) {
          console.log(`[Direct Inference Success: gemini-2.0-flash] (${text.length} chars)`);
          return text;
        }
      }
      throw new Error(`Primary inference returned status ${res.status}`);
    } catch (err) {
      console.warn('[Direct Inference fallback]:', err.message);
      try {
        const fbRes = await fetch('https://api.myclaw.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${myclawKey}`
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [{ role: 'user', content: contentPayload }],
            max_tokens: 500,
            temperature: 0.2
          })
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          return fbData.choices?.[0]?.message?.content || null;
        }
      } catch (fbErr) {
        console.error('[Fallback failed]:', fbErr.message);
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

    // Fast speculative fan-out: Run TypeSafe Jev System One evaluation IN PARALLEL with prompt assembly
    const jevPromise = evaluateWithJev(userMessage);

    // Initial system prompt base
    const buildSystemPrompt = (jevSignals) => {
      const toneDirective = jevSignals?.tone === 'career_strategist'
        ? 'SPECIALIZATION: [Career/Narrative] Elevate experience into CEO-ready assets, dollar metrics, and throughput velocity.'
        : jevSignals?.tone === 'tactical_coach'
        ? 'SPECIALIZATION: [Operations/Workflow] Frontline triage and high-velocity execution levers.'
        : 'SPECIALIZATION: [Finance/Strategy] Quantitative unit economics, margin defense, and breakeven models.';

      return `You are Consultant Studio in Rapid Brainstorming Mode. Your objective is to capture, organize, and synthesize business ideas instantly with zero conversational fluff, delivering high-density insights designed for sub-3-second reading and rapid generation.

${toneDirective}
${jevSignals?.needsMath ? 'CRITICAL MATH: Present shorthand quantitative metrics (e.g. $42k/mo, 34% COGS, 15% margin lift) with penny-balanced logic.' : ''}
${jevSignals?.urgency > 1.2 ? 'URGENT TRIAGE: Lead immediately with the #1 highest-leverage 24h stabilization move.' : ''}

SPEED & HIGH-DENSITY DIRECTIVES:
- Zero Preamble / Postamble: Never use conversational filler ("Sure, I can help", "Here is a breakdown", "Let me know"). Begin directly with content on line 1.
- Strict Density Cap: Keep responses between 60 and 140 words for lightning-fast executive scanning and sub-3-second generation.
- High-Density Formatting: Use the 3x3 Framework with bold keywords and compact bullets.

RAPID IDEA STRUCTURE (THE 3x3 FRAMEWORK):
1. **Core Angle / Thesis:** 1 crisp sentence defining the primary strategic opportunity or problem.
2. **3 High-Impact Levers:**
   - **[Lever 1]:** Key action and expected outcome with shorthand numbers.
   - **[Lever 2]:** Key action and expected outcome with shorthand numbers.
   - **[Lever 3]:** Key action and expected outcome with shorthand numbers.
3. **Next Pivot / One Follow-up:** 1 focused question or immediate next step to advance execution.

${conversationHistory ? `Conversation History:\n${conversationHistory}\n` : ''}
${documentText ? `ATTACHED CONTEXT / DOCUMENT:\n"""\n${documentText.slice(0, 4000)}\n"""\n` : ''}
User Query: "${userMessage}"`;
    };

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

    // Await Jev signals with tight boundary, then execute LLM inference
    const jevSignals = await jevPromise;
    const finalPrompt = buildSystemPrompt(jevSignals);

    console.log(`[Executing Live Inference for User Query | Multimodal Images: ${imageObjs.length}]`);
    const liveResponse = await queryAI(finalPrompt, imageObjs);

    if (liveResponse) {
      return res.json({ response: liveResponse, domain: jevSignals?.domain || null });
    }

    return res.status(503).json({ error: "Inference engine momentarily busy. Please resend." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Production Server] Consultant Studio running on port ${PORT}`);
});
